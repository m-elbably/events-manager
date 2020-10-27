/* eslint no-underscore-dangle: 0 */
const EventEmitter = require('events');

class EventsManager {
  constructor() {
    this._channels = {};
    this._eventEmitter = new EventEmitter();
  }

  // eslint-disable-next-line class-methods-use-this
  _validateArgs(channel, topic, callback) {
    if (channel == null) {
      throw new Error('Channel name is mandatory');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
  }

  _subscribe(channel, topic, callback) {
    const topicName = topic == null ? '*' : topic;
    const eventName = `${channel}.${topicName}`;
    if (this._channels[channel] == null) {
      this._channels[channel] = {
        topics: { [topicName]: [callback] }
      };
    } else if (this._channels[channel].topics[topicName] == null) {
      this._channels[channel].topics[topicName] = [callback];
    } else {
      this._channels[channel].topics[topicName].push(callback);
    }

    if (this._eventEmitter.listenerCount() + 1 >= this._eventEmitter.getMaxListeners()) {
      this._eventEmitter.MaxListeners(this._eventEmitter.listenerCount() + 1);
    }

    this._eventEmitter.addListener(eventName, callback);
  }

  subscribe(channel, topic, callback) {
    this._validateArgs(channel, topic, callback);
    this._subscribe(channel, topic, callback);
  }

  /**
   * Array of subscriber objects
   * @param subscribers
   * {
   *   channel: {type: 'string'},
   *   topic: {type: 'string'},
   *   callback: {type: 'function'}
   * }
   */
  subscribeMany(subscribers) {
    if (!Array.isArray(subscribers)) {
      throw new Error('Subscribers must be an array of objects');
    }

    // Validate all data before do the subscription
    subscribers.forEach((s) => this._validateArgs(s.channel, s.topic, s.callback));
    // Subscribe all
    subscribers.forEach((s) => this._subscribe(s.channel, s.topic, s.callback));
  }

  unsubscribe(channel, topic, callback) {
    this._validateArgs(channel, topic, callback);

    const topicName = topic == null ? '*' : topic;
    const topicListeners = this._channels[channel].topics[topicName];
    const eventListenerIndex = topicListeners.indexOf(callback);
    const eventName = `${channel}.${topicName}`;

    if (topicListeners != null && eventListenerIndex >= 0) {
      topicListeners.splice(eventListenerIndex, 1);
    }

    this._eventEmitter.removeListener(eventName, callback);
  }

  unsubscribeAllIn(channel, topic) {
    if (channel == null || this._channels[channel] == null) {
      return;
    }

    // Remove all registered subscribers under all topics in channel
    if (topic == null) {
      const { topics } = this._channels[channel];
      if (topics != null && Object.keys(topics).length > 0) {
        Object.keys(topics).forEach((t) => {
          const topicListeners = this._channels[channel].topics[t];
          this._eventEmitter.removeAllListeners(`${channel}.${t}`);
          this._channels[channel].topics[t].splice(0, topicListeners.length);
        });
      }
    } else {
      const topicListeners = this._channels[channel].topics[topic];
      this._eventEmitter.removeAllListeners(`${channel}.${topic}`);
      this._channels[channel].topics[topic].splice(0, topicListeners.length);
    }
  }

  unsubscribeAll() {
    Object.keys(this._channels).forEach((c) => {
      this.unsubscribeAllIn(c);
    });
  }

  getChannels() {
    return Object.keys(this._channels).map((k) => k);
  }

  getTopics(channel) {
    if (channel == null || this._channels[channel] == null) {
      return [];
    }

    return Object.keys(this._channels[channel].topics).map((k) => k);
  }

  getSubscribers(channel, topic) {
    const subscribers = [];
    if (channel == null || this._channels[channel] == null) {
      return subscribers;
    }

    if (topic == null) {
      const { topics } = this._channels[channel];
      if (topics != null && Object.keys(topics).length > 0) {
        Object.keys(topics).forEach((t) => {
          const topicListeners = this._channels[channel].topics[t];
          subscribers.push(...topicListeners);
        });
      }
    } else {
      const topicListeners = this._channels[channel].topics[topic];
      subscribers.push(...topicListeners);
    }

    return subscribers;
  }

  publish(channel, topic, payload) {
    const topicName = topic == null ? '*' : topic;
    const channelGlobalEventName = `${channel}.*`;
    const eventName = `${channel}.${topicName}`;

    if (this._channels[channel] == null) {
      throw new Error(`Channel ${channel} does not exists, make sure that you have subscribers to get channel created`);
    }

    this._eventEmitter.emit(eventName, payload);

    const channelGlobalTopic = this._channels[channel].topics['*'];
    if (topicName !== '*' && channelGlobalTopic != null && channelGlobalTopic.length > 0) {
      this._eventEmitter.emit(channelGlobalEventName, payload);
    }
  }
}

module.exports = EventsManager;
