'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _decodeOffsetKey = require('../utils/decodeOffsetKey');

var _decodeOffsetKey2 = _interopRequireDefault(_decodeOffsetKey);

var _draftJs = require('draft-js');

var _getSearchText2 = require('../utils/getSearchText');

var _getSearchText3 = _interopRequireDefault(_getSearchText2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var sizeOf = function sizeOf(e) {
  return Array.isArray(e) ? e.length : e.size;
};
var elementAt = function elementAt(e, i) {
  return Array.isArray(e) ? e[i] : e.get(i);
};

var ARROW_THRESHOLD = 250;

var componentCreator = function componentCreator(addModifier, Entry, suggestionsThemeKey) {
  var _class, _temp2;

  return _temp2 = _class = function (_Component) {
    _inherits(CompletionSuggestions, _Component);

    function CompletionSuggestions() {
      var _ref;

      var _temp, _this, _ret;

      _classCallCheck(this, CompletionSuggestions);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = CompletionSuggestions.__proto__ || Object.getPrototypeOf(CompletionSuggestions)).call.apply(_ref, [this].concat(args))), _this), _this.lastArrowTimestamps = {
        up: new Date(),
        down: new Date()
      }, _this.state = {
        isActive: false,
        focusedOptionIndex: 0
      }, _this.componentDidUpdate = function (prevProps, prevState) {
        var _this$props = _this.props,
            suggestions = _this$props.suggestions,
            store = _this$props.store,
            positionSuggestions = _this$props.positionSuggestions;
        var focusedOptionIndex = _this.state.focusedOptionIndex;
        var popover = _this.refs.popover;


        if (popover && store.isSearchActive(_this.activeOffsetKey)) {
          // In case the list shrinks there should be still an option focused.
          // Note: this might run multiple times and deduct 1 until the condition is
          // not fullfilled anymore.
          var size = sizeOf(suggestions);
          if (size > 0 && focusedOptionIndex >= size) {
            _this.setState({ focusedOptionIndex: size - 1 });
          }

          var decoratorRect = store.getPortalClientRect(_this.activeOffsetKey);
          var newStyles = positionSuggestions({
            decoratorRect: decoratorRect,
            prevProps: prevProps,
            prevState: prevState,
            props: _this.props,
            state: _this.state,
            popover: popover
          });
          Object.keys(newStyles).forEach(function (key) {
            popover.style[key] = newStyles[key];
          });
        }
      }, _this.componentWillUnmount = function () {
        _this.props.callbacks.onChange = undefined;
      }, _this.onEditorStateChange = function (editorState) {
        var _this$props2 = _this.props,
            store = _this$props2.store,
            autocompleteChar = _this$props2.autocompleteChar;
        var isActive = _this.state.isActive;


        var searches = store.getAllSearches();

        // if no search portal is active there is no need to show the popover
        if (searches.size === 0) {
          return editorState;
        }

        var removeList = function removeList() {
          store.resetEscapedSearch();
          _this.closeDropdown();
          return editorState;
        };

        // get the current selection
        var selection = editorState.getSelection();
        var anchorKey = selection.getAnchorKey();
        var anchorOffset = selection.getAnchorOffset();

        // the list should not be visible if a range is selected or the editor has no focus
        if (!selection.isCollapsed() || !selection.getHasFocus()) return removeList();

        // identify the start & end positon of each search-text
        var offsetDetails = searches.map(_decodeOffsetKey2.default);

        // a leave can be empty when it is removed due e.g. using backspace
        var leaves = offsetDetails.filter(function (_ref2) {
          var blockKey = _ref2.blockKey;
          return blockKey === anchorKey;
        }).map(function (_ref3) {
          var blockKey = _ref3.blockKey,
              decoratorKey = _ref3.decoratorKey,
              leafKey = _ref3.leafKey;

          var tree = editorState.getBlockTree(blockKey);
          return tree && tree.getIn([decoratorKey, 'leaves', leafKey]);
        });

        // if all leaves are undefined the popover should be removed
        if (leaves.every(function (leave) {
          return !leave;
        })) {
          return removeList();
        }

        // Checks that the cursor is after the 'autocomplete' character but still somewhere in
        // the word (search term). Setting it to allow the cursor to be left of
        // the 'autocomplete character' causes troubles due selection confusion.

        var selectionIsInsideWord = leaves.filter(function (leave) {
          return !!leave;
        }).map(function (_ref4) {
          var start = _ref4.start,
              end = _ref4.end;
          return start === 0 && anchorOffset === autocompleteChar.length && anchorOffset <= end || // @ is the first character
          anchorOffset > start + autocompleteChar.length && anchorOffset <= end // @ is in the text or at the end
          ;
        });

        if (selectionIsInsideWord.every(function (isInside) {
          return !isInside;
        })) return removeList();

        _this.activeOffsetKey = selectionIsInsideWord.filter(function (value) {
          return !!value;
        }).keySeq().first();

        _this.onSearchChange(editorState, selection);

        // make sure the escaped search is reseted in the cursor since the user
        // already switched to another completion search
        if (!store.isEscaped(_this.activeOffsetKey)) {
          store.resetEscapedSearch();
        }

        // If none of the above triggered to close the window, it's safe to assume
        // the dropdown should be open. This is useful when a user focuses on another
        // input field and then comes back: the dropdown will again.
        if (!isActive && !store.isEscaped(_this.activeOffsetKey)) {
          _this.openDropdown();
        }

        // makes sure the focused index is reseted every time a new selection opens
        // or the selection was moved to another completion search
        if (!_this.lastSelectionIsInsideWord || !selectionIsInsideWord.equals(_this.lastSelectionIsInsideWord)) {
          _this.setState({ focusedOptionIndex: 0 });
        }

        _this.lastSelectionIsInsideWord = selectionIsInsideWord;

        return editorState;
      }, _this.onSearchChange = function (editorState, selection) {
        var onSearchChange = _this.props.onSearchChange;

        var _getSearchText = (0, _getSearchText3.default)(editorState, selection),
            searchValue = _getSearchText.word;

        if (_this.lastSearchValue !== searchValue) {
          _this.lastSearchValue = searchValue;
          onSearchChange({ value: searchValue, editorState: editorState, selection: selection });
        }
      }, _this.withTraverseLogic = function (direction, fn) {
        return function (keyboardEvent) {
          // hitting up/down twice "fast" means you want to traverse the editor instead of
          // moving between options
          var previousArrowHit = _this.lastArrowTimestamps[direction];
          _this.lastArrowTimestamps[direction] = new Date();
          if (_this.lastArrowTimestamps[direction] - previousArrowHit <= ARROW_THRESHOLD) {
            return;
          }
          keyboardEvent.preventDefault();
          return fn(keyboardEvent);
        };
      }, _this.onUpArrow = _this.withTraverseLogic('up', function (keyboardEvent) {
        var suggestions = _this.props.suggestions;
        var focusedOptionIndex = _this.state.focusedOptionIndex;


        var suggestionsSize = sizeOf(suggestions);
        if (suggestionsSize > 0) {
          var newIndex = focusedOptionIndex - 1;
          _this.onCompletionFocus(newIndex < 0 ? suggestionsSize - 1 : newIndex);
        }
      }), _this.onDownArrow = _this.withTraverseLogic('down', function (keyboardEvent) {
        var suggestions = _this.props.suggestions;
        var focusedOptionIndex = _this.state.focusedOptionIndex;


        var newIndex = focusedOptionIndex + 1;
        _this.onCompletionFocus(newIndex >= sizeOf(suggestions) ? 0 : newIndex);
      }), _this.handleReturn = function (keyboardEvent) {
        var suggestions = _this.props.suggestions;
        var focusedOptionIndex = _this.state.focusedOptionIndex;

        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();

        _this.onCompletionSelect(elementAt(suggestions, focusedOptionIndex));

        // return true
        return 'handled';
      }, _this.onTab = _this.handleReturn, _this.onEscape = function (keyboardEvent) {
        var store = _this.props.store;

        keyboardEvent.preventDefault();

        var activeOffsetKey = _this.lastSelectionIsInsideWord.filter(function (value) {
          return !!value;
        }).keySeq().first();
        store.escapeSearch(activeOffsetKey);
        _this.closeDropdown();

        // to force a re-render of the outer component to change the aria props
        store.setEditorState(store.getEditorState());
      }, _this.onCompletionSelect = function (completion) {
        var _this$props3 = _this.props,
            store = _this$props3.store,
            entityMutability = _this$props3.entityMutability,
            setFocusedItem = _this$props3.setFocusedItem;


        _this.closeDropdown();
        var newEditorState = addModifier(store.getEditorState(), completion, entityMutability);
        store.setEditorState(newEditorState);
      }, _this.onCompletionFocus = function (index) {
        var _this$props4 = _this.props,
            ariaProps = _this$props4.ariaProps,
            store = _this$props4.store,
            setFocusedItem = _this$props4.setFocusedItem;


        var descendant = 'completion-option-' + _this.key + '-' + index;
        ariaProps.ariaActiveDescendantID = descendant;

        _this.state.focusedOptionIndex = index;

        // to force a re-render of the outer component to change the aria props
        store.setEditorState(store.getEditorState());
        setFocusedItem(Math.random());
      }, _this.openDropdown = function () {
        var _this$props5 = _this.props,
            callbacks = _this$props5.callbacks,
            ariaProps = _this$props5.ariaProps,
            onOpen = _this$props5.onOpen;
        var focusedOptionIndex = _this.state.focusedOptionIndex;

        // This is a really nasty way of attaching & releasing the key related functions.
        // It assumes that the keyFunctions object will not loose its reference and
        // by this we can replace inner parameters spread over different modules.
        // This better be some registering & unregistering logic. PRs are welcome :)

        callbacks.onDownArrow = _this.onDownArrow;
        callbacks.onUpArrow = _this.onUpArrow;
        callbacks.onEscape = _this.onEscape;
        callbacks.handleReturn = _this.handleReturn;
        callbacks.onTab = _this.onTab;

        var descendant = 'completion-option-' + _this.key + '-' + focusedOptionIndex;
        ariaProps.ariaActiveDescendantID = descendant;
        ariaProps.ariaOwneeID = 'completions-list-' + _this.key;
        ariaProps.ariaHasPopup = 'true';
        ariaProps.ariaExpanded = 'true';

        _this.setState({ isActive: true });

        if (onOpen) {
          onOpen();
        }
      }, _this.closeDropdown = function () {
        var _this$props6 = _this.props,
            callbacks = _this$props6.callbacks,
            ariaProps = _this$props6.ariaProps,
            onClose = _this$props6.onClose;

        // make sure none of these callbacks are triggered

        callbacks.onDownArrow = undefined;
        callbacks.onUpArrow = undefined;
        callbacks.onTab = undefined;
        callbacks.onEscape = undefined;
        callbacks.handleReturn = undefined;

        ariaProps.ariaHasPopup = 'false';
        ariaProps.ariaExpanded = 'false';
        ariaProps.ariaActiveDescendantID = undefined;
        ariaProps.ariaOwneeID = undefined;

        _this.setState({ isActive: false });

        if (onClose) {
          onClose();
        }
      }, _temp), _possibleConstructorReturn(_this, _ret);
    }

    _createClass(CompletionSuggestions, [{
      key: 'componentWillMount',
      value: function componentWillMount() {
        this.key = (0, _draftJs.genKey)();
        this.props.callbacks.onChange = this.onEditorStateChange;
      }
    }, {
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps(nextProps) {
        if (sizeOf(nextProps.suggestions) === 0 && this.state.isActive) {
          this.closeDropdown();
        }
      }
    }, {
      key: 'render',
      value: function render() {
        var _this2 = this;

        var _state = this.state,
            isActive = _state.isActive,
            focusedOptionIndex = _state.focusedOptionIndex;
        var _props = this.props,
            _props$theme = _props.theme,
            theme = _props$theme === undefined ? {} : _props$theme,
            suggestions = _props.suggestions;


        if (!isActive) {
          return null;
        }

        return _react2.default.createElement(
          'div',
          {
            className: theme[suggestionsThemeKey],
            role: 'listbox',
            id: 'completions-list-' + this.key,
            ref: 'popover'
          },
          suggestions.map(function (completion, index) {
            return _react2.default.createElement(Entry, {
              key: index,
              onCompletionSelect: _this2.onCompletionSelect,
              onCompletionFocus: _this2.onCompletionFocus,
              isFocused: focusedOptionIndex === index,
              completion: completion,
              index: index,
              id: 'completion-option-' + _this2.key + '-' + index,
              theme: theme
            });
          }) // .toJS()

        );
      }
    }]);

    return CompletionSuggestions;
  }(_react.Component), _class.propTypes = {
    entityMutability: _propTypes2.default.oneOf(['SEGMENTED', 'IMMUTABLE', 'MUTABLE'])
  }, _temp2;
};

exports.default = componentCreator;