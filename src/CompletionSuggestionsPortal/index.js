import React, { Component } from 'react';

export default class CompletionSuggestionsPortal extends Component {

  componentWillMount() {
    const { autocompleteStore, offsetKey, setEditorState, getEditorState } = this.props
    autocompleteStore.register(offsetKey)
    this.updatePortalClientRect(this.props)

    // trigger a re-render so the MentionSuggestions becomes active
    setEditorState(getEditorState())
  }

  componentWillReceiveProps(nextProps) {
    this.updatePortalClientRect(nextProps)
  }

  componentWillUnmount() {
    const { autocompleteStore, offsetKey } = this.props
    autocompleteStore.unregister(offsetKey)
  }

  updatePortalClientRect(props) {
    this.props.autocompleteStore.updatePortalClientRect(
      props.offsetKey,
      () => this.refs.searchPortal.getBoundingClientRect(),
    )
  }

  render() {
    const { decoratorComponent: DecoratorComponent } = this.props

    const content = (
      <span ref="searchPortal">
        {this.props.children}
      </span>
    )
    return DecoratorComponent ?
      (<DecoratorComponent {...this.props}>{content}</DecoratorComponent>) : content
  }
}
