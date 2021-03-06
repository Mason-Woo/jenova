"""Trigger implementation for testing trained model"""

import json
import logging

import nltk

from utils import http
from utils.learn import classifier
from utils.learn import pre_process
from utils.learn import persist
from utils.factory.tokenizer import TokenizerFactory

LOGGER = logging.getLogger(__name__)

class Predict(object):
    """Trigger to predict the intent of a text"""

    def run(self, execution_context, app_context):
        """run the action"""
        filtered_word_types = app_context.get_config('train.filtered_word_types')

        data_name = execution_context.event.get('data_name', 'default')
        text = execution_context.event.get('text')
        if text is None:
            raise ValueError('text cannot be null')

        config = persist.get_data_config(data_name)
        tokenizer = TokenizerFactory.get_tokenizer(config.get('tokenizer'))

        # clean text if requested
        if config.get('clean_text'):
            text = pre_process.clean_text(text, filtered_word_types)

        # tokenize words and predict
        result_word, result_proba = classifier.predict(text, data_name)
        result_proba *= 100

        # pos tagging the text
        filtered_word_type = app_context.get_config('predict.filtered_word_types')
        tagged_text = self.tag_text(tokenizer(text), filtered_word_type)


        url = app_context.get_config('bot.url')
        _, content = self.send_msg(result_word, result_proba, tagged_text, url)
        content_obj = json.loads(content.decode('utf-8'))

        result = 'predict: ' + result_word + ' with probability: ' \
                    + str((int)(result_proba)) + '%. response from bot: ' \
                    + str(content_obj.get('msg')) \
                    + ' [tagged words: ' + ' ' \
                    + ' '.join(list(map(lambda w: '(' + w[0] + ' ' + w[1] + ')', tagged_text))) \
                    + ']'
        execution_context.finish({
            'raw': result,
            'bot_response': content_obj.get('msg')
        })

    def tag_text(self, tokenized_text, filtered_word_type):
        """pos tagging text"""
        tagged_text = nltk.pos_tag(tokenized_text)
        return [(w, wtype) for w, wtype in tagged_text if not wtype in filtered_word_type]

    def send_msg(self, result_word, result_proba, filtered_text, url):
        """send the message to bot"""
        msg = {
            'name': result_word,
            'args': {
                'proba': result_proba,
                'tagged_text': filtered_text
            }
        }
        return http.call(url, msg)
