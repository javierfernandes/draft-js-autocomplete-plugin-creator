import React, { Component } from 'react';

export default class CompletionSuggestionsPortal extends Component {

  componentWillMount() {
    const { store, offsetKey, setEditorState, getEditorState } = this.props
    store.register(offsetKey)
    this.updatePortalClientRect(this.props)

    // trigger a re-render so the MentionSuggestions becomes active
    setEditorState(getEditorState())
  }

  componentWillReceiveProps(nextProps) {
    this.updatePortalClientRect(nextProps)
  }

  componentWillUnmount() {
    const { store, offsetKey } = this.props
    store.unregister(offsetKey)
  }

  updatePortalClientRect(props) {
    this.props.store.updatePortalClientRect(
      props.offsetKey,
      () => this.refs.searchPortal.getBoundingClientRect(),
    )
  }

  render() {
    return (
      <span className={this.key} ref="searchPortal">
        {this.props.children}
      </span>
    )
  }
}
