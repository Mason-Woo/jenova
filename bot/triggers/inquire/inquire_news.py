"""Trigger implementation for inquiring news"""

import re
import random

from ev3bot.trigger import Trigger

from utils import tts
from utils.social import twitter

class InquireNews(Trigger):
    """Trigger to inquire the news"""

    def run(self, execution_context):
        """run the action"""
        lang = self.get_config('behavior.news_react.lang')
        tweet_count = self.get_config('behavior.news_react.count')
        opening = self.get_config('behavior.news_react.opening')
        tts.say_random(opening)

        # get all tweets from user timeline
        tweets = twitter.get_statuses(tweet_count)

        # filter tweets by language
        tweets = [tweet for tweet in tweets if tweet['user']['lang'] == lang]

        if len(tweets) == 0:
            no_news_reacts = self.get_config('behavior.news_react.no_data')
            tts.say_random_finish(no_news_reacts, execution_context)
            return

        # get random tweets
        rand_tweet = tweets[random.randint(0, len(tweets) - 1)]

        new_tmpl = self.get_config('behavior.news_react.templates')

        text = tts.get_random(new_tmpl, {
            'text': rand_tweet['text'],
            'user': rand_tweet['user']['name']
        })
        execution_context.finish(text)

        tts.say_random(self.get_config('behavior.news_react.has_data'))

        # filter URL & hashtags
        text = re.sub(r'http\S+', '', text)
        if not lang == 'en':
            text = re.sub(r'#\S+', '', text)

        tts.say([text])
