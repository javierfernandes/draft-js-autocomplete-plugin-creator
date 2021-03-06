import completionSuggestionsCreator from './CompletionSuggestions'
import CompletionSuggestionsPortal from './CompletionSuggestionsPortal'
import decorateComponentWithProps from 'decorate-component-with-props'
import { Map } from 'immutable'
import suggestionsFilter from './utils/defaultSuggestionsFilter'
import defaultPositionSuggestions from './utils/positionSuggestions'

const createCompletionPlugin = (
  completionSuggestionsStrategy,
  addModifier,
  SuggestionEntry,
  suggestionsThemeKey = 'completionSuggestions',
  additionalDecorators = [],
  decoratorComponent
) => (config = {}) => {

  const callbacks = {
    keyBindingFn: undefined,
    handleKeyCommand: undefined,
    onDownArrow: undefined,
    onUpArrow: undefined,
    onTab: undefined,
    onEscape: undefined,
    handleReturn: undefined,
    onChange: undefined,
  }

  const ariaProps = {
    ariaHasPopup: 'false',
    ariaExpanded: 'false',
    ariaOwneeID: undefined,
    ariaActiveDescendantID: undefined,
  }

  let searches = Map()
  let escapedSearch = undefined
  let clientRectFunctions = Map()

  const store = {
    getEditorState: undefined,
    setEditorState: undefined,
    getPortalClientRect: offsetKey => clientRectFunctions.get(offsetKey)(),
    getAllSearches: () => searches,
    
    isEscaped: offsetKey => escapedSearch === offsetKey,
    escapeSearch: offsetKey => { escapedSearch = offsetKey },
    resetEscapedSearch: () => { escapedSearch = undefined },

    updatePortalClientRect: (offsetKey, func) => {
      clientRectFunctions = clientRectFunctions.set(offsetKey, func)
    },

    register: offsetKey => {
      searches = searches.set(offsetKey, offsetKey)
    },

    unregister: offsetKey => {
      searches = searches.delete(offsetKey)
      clientRectFunctions = clientRectFunctions.delete(offsetKey)
    },
  
    register: offsetKey => { searches = searches.set(offsetKey, offsetKey) },
    isSearchActive: offsetKey => searches.has(offsetKey),

    unregister: offsetKey => {
      searches = searches.delete(offsetKey)
      clientRectFunctions = clientRectFunctions.delete(offsetKey)
    },
  }

  const { theme = {}, positionSuggestions = defaultPositionSuggestions, autocompleteChar = '' } = config
  const completionSearchProps = {
    ariaProps,
    callbacks,
    theme,
    store,
    entityMutability: config.entityMutability ? config.entityMutability : 'SEGMENTED',
    positionSuggestions,

    autocompleteChar
  }
  const CompletionSuggestions = completionSuggestionsCreator(addModifier, SuggestionEntry, suggestionsThemeKey)

  const toCallback = name => keyboardEvent => callbacks[name] && callbacks[name](keyboardEvent)

  return {
    CompletionSuggestions: decorateComponentWithProps(CompletionSuggestions, completionSearchProps),
    decorators: [
      {
        strategy: completionSuggestionsStrategy,
        component: decorateComponentWithProps(CompletionSuggestionsPortal, { autocompleteStore: store, decoratorComponent }),
      },
      ...additionalDecorators,
    ],
    getAccessibilityProps: () => ({
      role: 'combobox',
      ariaAutoComplete: 'list',
      ariaHasPopup: ariaProps.ariaHasPopup,
      ariaExpanded: ariaProps.ariaExpanded,
      ariaActiveDescendantID: ariaProps.ariaActiveDescendantID,
      ariaOwneeID: ariaProps.ariaOwneeID,
    }),

    initialize: ({ getEditorState, setEditorState }) => {
      store.getEditorState = getEditorState
      store.setEditorState = setEditorState
    },

    ...['onDownArrow', 'onTab', 'onUpArrow', 'onEscape', 'handleReturn']
      .reduce((acc, name) => { acc[name] = toCallback(name); return acc }, {}),
  
    onChange: editorState => {
      if (callbacks.onChange) return callbacks.onChange(editorState)
      return editorState
    },
  }
}

export default createCompletionPlugin

export const defaultSuggestionsFilter = suggestionsFilter
