import React, { Component } from 'react'
import PropTypes from 'prop-types'

import decodeOffsetKey from '../utils/decodeOffsetKey'
import { genKey, convertToRaw } from 'draft-js'
import getSearchText from '../utils/getSearchText'

const componentCreator = (addModifier, Entry, suggestionsThemeKey) => 
  class CompletionSuggestions extends Component {

    static propTypes = {
      entityMutability: PropTypes.oneOf([
        'SEGMENTED',
        'IMMUTABLE',
        'MUTABLE',
      ])
    }

    state = {
      isActive: false,
      focusedOptionIndex: 0,
    }

    componentWillMount() {
      this.key = genKey()
      this.props.callbacks.onChange = this.onEditorStateChange
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.suggestions.size === 0 && this.state.isActive) {
        this.closeDropdown()
      }
    }

    componentDidUpdate = (prevProps, prevState) => {
      const { suggestions, store, positionSuggestions } = this.props
      const { focusedOptionIndex } = this.state
      const { popover } = this.refs

      if (popover && store.isSearchActive(this.activeOffsetKey)) {
        // In case the list shrinks there should be still an option focused.
        // Note: this might run multiple times and deduct 1 until the condition is
        // not fullfilled anymore.
        const size = suggestions.size
        if (size > 0 && focusedOptionIndex >= size) {
          this.setState({ focusedOptionIndex: size - 1 })
        }

        const decoratorRect = store.getPortalClientRect(this.activeOffsetKey)
        const newStyles = positionSuggestions({
          decoratorRect,
          prevProps,
          prevState,
          props: this.props,
          state: this.state,
          popover,
        })
        Object.keys(newStyles).forEach(key => {
          popover.style[key] = newStyles[key]
        })
      }
    }

    componentWillUnmount = () => {
      this.props.callbacks.onChange = undefined
    }

    onEditorStateChange = editorState => {
      const { store, autocompleteChar } = this.props
      const { isActive } = this.state

      const searches = store.getAllSearches()

      // if no search portal is active there is no need to show the popover
      if (searches.size === 0) { return editorState }

      const removeList = () => {
        store.resetEscapedSearch()
        this.closeDropdown()
        return editorState
      }

      // get the current selection
      const selection = editorState.getSelection()
      const anchorKey = selection.getAnchorKey()
      const anchorOffset = selection.getAnchorOffset()

      // the list should not be visible if a range is selected or the editor has no focus
      if (!selection.isCollapsed() || !selection.getHasFocus()) return removeList()

      // identify the start & end positon of each search-text
      const offsetDetails = searches.map(decodeOffsetKey)

      // a leave can be empty when it is removed due e.g. using backspace
      const leaves = offsetDetails
        .filter(({ blockKey }) => blockKey === anchorKey)
        .map(({ blockKey, decoratorKey, leafKey }) => (
          editorState
            .getBlockTree(blockKey)
            .getIn([decoratorKey, 'leaves', leafKey])
        ))

      // if all leaves are undefined the popover should be removed
      if (leaves.every(leave => !leave)) { return removeList() }

      // Checks that the cursor is after the 'autocomplete' character but still somewhere in
      // the word (search term). Setting it to allow the cursor to be left of
      // the 'autocomplete character' causes troubles due selection confusion.

      const selectionIsInsideWord = leaves
        .filter(leave => !!leave)
        .map(({ start, end }) => (
          start === 0 && anchorOffset === autocompleteChar.length && anchorOffset <= end || // @ is the first character
          anchorOffset > start + autocompleteChar.length && anchorOffset <= end // @ is in the text or at the end
        ))

      if (selectionIsInsideWord.every(isInside => !isInside)) return removeList()

      this.activeOffsetKey = selectionIsInsideWord
        .filter(value => !!value)
        .keySeq()
        .first()

      this.onSearchChange(editorState, selection)

      // make sure the escaped search is reseted in the cursor since the user
      // already switched to another completion search
      if (!store.isEscaped(this.activeOffsetKey)) {
        store.resetEscapedSearch()
      }

      // If none of the above triggered to close the window, it's safe to assume
      // the dropdown should be open. This is useful when a user focuses on another
      // input field and then comes back: the dropdown will again.
      if (!isActive && !store.isEscaped(this.activeOffsetKey)) {
        this.openDropdown()
      }

      // makes sure the focused index is reseted every time a new selection opens
      // or the selection was moved to another completion search
      if (!this.lastSelectionIsInsideWord || !selectionIsInsideWord.equals(this.lastSelectionIsInsideWord)) {
        this.setState({ focusedOptionIndex: 0 })
      }

      this.lastSelectionIsInsideWord = selectionIsInsideWord

      return editorState
    }

    onSearchChange = (editorState, selection) => {
      const { onSearchChange } = this.props
      const { word: searchValue } = getSearchText(editorState, selection)
      
      if (this.lastSearchValue !== searchValue) {
        this.lastSearchValue = searchValue
        onSearchChange({ value: searchValue })
      }
    }

    onDownArrow = keyboardEvent => {
      const { suggestions } = this.props
      const { focusedOptionIndex } = this.state

      keyboardEvent.preventDefault()
      const newIndex = focusedOptionIndex + 1
      this.onCompletionFocus(newIndex >= suggestions.size ? 0 : newIndex)
    }

    onUpArrow = keyboardEvent => {
      const { suggestions } = this.props
      const { focusedOptionIndex } = this.state

      keyboardEvent.preventDefault()
      if (suggestions.size > 0) {
        const newIndex = focusedOptionIndex - 1
        this.onCompletionFocus(Math.max(newIndex, 0))
      }
    }

    handleReturn = keyboardEvent => {
      const { suggestions } = this.props
      const { focusedOptionIndex } = this.state
      keyboardEvent.preventDefault()
      this.onCompletionSelect(suggestions.get(focusedOptionIndex))
      return true
    }

    onTab = this.handleReturn

    onEscape = keyboardEvent => {
      const { store } = this.props
      keyboardEvent.preventDefault()

      const activeOffsetKey = this.lastSelectionIsInsideWord
        .filter(value => !!value)
        .keySeq()
        .first()
      store.escapeSearch(activeOffsetKey)
      this.closeDropdown()

      // to force a re-render of the outer component to change the aria props
      store.setEditorState(store.getEditorState())
    }

    onCompletionSelect = completion => {
      const { store, entityMutability, setFocusedItem } = this.props

      this.closeDropdown()
      const newEditorState = addModifier(store.getEditorState(), completion, entityMutability)
      store.setEditorState(newEditorState)
    }

    onCompletionFocus = index => {
      const { ariaProps, store, setFocusedItem } = this.props

      const descendant = `completion-option-${this.key}-${index}`
      ariaProps.ariaActiveDescendantID = descendant
      this.state.focusedOptionIndex = index

      // to force a re-render of the outer component to change the aria props
      store.setEditorState(store.getEditorState())
      setFocusedItem(Math.random())
    }

    openDropdown = () => {
      const { callbacks, ariaProps, onOpen } = this.props
      const { focusedOptionIndex } = this.state
      // This is a really nasty way of attaching & releasing the key related functions.
      // It assumes that the keyFunctions object will not loose its reference and
      // by this we can replace inner parameters spread over different modules.
      // This better be some registering & unregistering logic. PRs are welcome :)
      callbacks.onDownArrow = this.onDownArrow
      callbacks.onUpArrow = this.onUpArrow
      callbacks.onEscape = this.onEscape
      callbacks.handleReturn = this.handleReturn
      callbacks.onTab = this.onTab

      const descendant = `completion-option-${this.key}-${focusedOptionIndex}`
      ariaProps.ariaActiveDescendantID = descendant
      ariaProps.ariaOwneeID = `completions-list-${this.key}`
      ariaProps.ariaHasPopup = 'true'
      ariaProps.ariaExpanded = 'true'
      
      this.setState({ isActive: true })

      if (onOpen) { onOpen() }
    }

    closeDropdown = () => {
      const { callbacks, ariaProps, onClose } = this.props

      // make sure none of these callbacks are triggered
      callbacks.onDownArrow = undefined
      callbacks.onUpArrow = undefined
      callbacks.onTab = undefined
      callbacks.onEscape = undefined
      callbacks.handleReturn = undefined

      ariaProps.ariaHasPopup = 'false'
      ariaProps.ariaExpanded = 'false'
      ariaProps.ariaActiveDescendantID = undefined
      ariaProps.ariaOwneeID = undefined
      this.setState({ isActive: false })

      if (onClose) { onClose() }
    }

    render() {
      const { isActive, focusedOptionIndex } = this.state
      const { theme = {}, suggestions } = this.props
      
      if (!isActive) { return null }

      return (
        <div
          className={ theme[suggestionsThemeKey] }
          role="listbox"
          id={ `completions-list-${this.key}` }
          ref="popover"
        >
          {
            suggestions.map((completion, index) => (
              <Entry
                key={index}
                onCompletionSelect={this.onCompletionSelect}
                onCompletionFocus={this.onCompletionFocus}
                isFocused={focusedOptionIndex === index}
                completion={completion}
                index={index}
                id={`completion-option-${this.key}-${index}`}
                theme={theme}
              />
            )).toJS()
          }
        </div>
      )
    }
  }

export default componentCreator
