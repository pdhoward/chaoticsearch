import React, { PropTypes } from 'react';

export default class MessageListItem extends React.Component {
  static propTypes = {
    message: PropTypes.object.isRequired
  };
  handleClick(user) {
    this.props.handleClickOnUser(user);
  }
  render() {

    const { message } = this.props;

    var stringText = message.text;
    var text = new Array();
    text = stringText.split("\n");
    var formatted = text.map(function(line) {
        return (<p>{line}</p>)
      })

    return (
      <li>
        <span>
          <b style={{color: '#66c'}}><button style={{background: 'Transparent',backgroundRepeat: 'noRepeat', border: 'none', cursor: 'pointer', overflow: 'hidden', outline: 'none'}} onClick={this.handleClick.bind(this, message.user)}>{message.user.username}</button></b>
          <i style={{color: '#aad', opacity: '0.8'}}>{message.time}</i>
        </span>
        <div style={{clear: 'both', paddingTop: '0.1em', marginTop: '-1px', paddingBottom: '0.3em'}}>{formatted}</div>
      </li>
    );
  }
}
