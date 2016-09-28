import { CHANGE_CHANNEL } from '../constants/ActionTypes';
import channelDefault from '../../../config/channelDefault.js';

const initialState = channelDefault.INITIALCHANNEL;

export default function activeChannel(state = initialState, action) {

  switch (action.type) {
  case CHANGE_CHANNEL:
    return {
      name: action.channel.name,
      id: action.channel.id
    };

  default:
    return state;
  }
}
