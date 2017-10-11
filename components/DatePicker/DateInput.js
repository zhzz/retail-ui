// @flow

import classNames from 'classnames';
import React, { Component } from 'react';

import PropTypes from 'prop-types';

import Input from '../Input';
import Icon from '../Icon';

import filterProps from '../filterProps';
import styles from './DateInput.less';

const INPUT_PASS_PROPS = {
  autoFocus: true,
  disabled: true,
  warning: true,
  error: true,
  size: true,
  placeholder: true,

  onInput: true,
  onKeyDown: true,
  onKeyPress: true,
  onKeyUp: true
};

type Props = {
  disabled?: boolean,
  getIconRef?: (ref: HTMLElement) => void,
  getInputRef?: (ref: Input) => void,
  onBlur?: (e: Event) => void,
  onSubmit?: () => void,
  onChange: (value: Date | string | void) => void,
  onFocus?: () => void,
  onIconClick: () => void,
  opened: boolean,
  placeholder?: string,
  size: 'small' | 'medium' | 'large',
  value: string
};

export default class DateInput extends Component<Props> {
  static propTypes = {
    getIconRef: PropTypes.func,
    getInputRef: PropTypes.func,
    opened: PropTypes.bool.isRequired,
    placeholder: PropTypes.string,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    value: PropTypes.string.isRequired,
    onBlur: PropTypes.func,
    onChange: PropTypes.func.isRequired,
    onFocus: PropTypes.func,
    onIconClick: PropTypes.func.isRequired
  };

  _input: ?Input;
  _icon: ?HTMLElement;
  _cursorPosition = 0;

  render() {
    const maskChar = this.props.withMask ? '_' : null;
    const iconSize = this.props.size === 'large' ? 16 : 14;
    const openClassName = classNames({
      [styles.openButton]: true,
      [styles.openButtonDisabled]: this.props.disabled
    });
    return (
      <div
        onMouseDown={this.preventSelection}
        onClick={this.getCursorPosition}
        onDoubleClick={this.createSelection}
      >
        <Input
          {...filterProps(this.props, INPUT_PASS_PROPS)}
          mask="99.99.9999"
          maskChar={maskChar}
          maxLength={10}
          value={this.props.value}
          width="100%"
          onBlur={this.handleBlur}
          onFocus={this.handleFocus}
          onChange={this.handleDateChange}
          onKeyDown={this._handleKeyDown}
          ref={this.getInputRef}
          rightIcon={
            <span
              className={openClassName}
              onMouseDown={this.props.onIconClick}
              ref={this.getIconRef}
            >
              <Icon name="calendar" size={iconSize} />
            </span>
          }
        />
      </div>
    );
  }

  componentDidMount() {
    if (this.props.getInputRef && this._input) {
      this.props.getInputRef(this._input);
    }
    if (this.props.getIconRef && this._icon) {
      this.props.getIconRef(this._icon);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.value !== this.props.value && this._cursorPosition) {
      this._input &&
        this._input.setSelectionRange(
          this._cursorPosition,
          this._cursorPosition
        );
    }
  }

  preventSelection = (event: SyntheticMouseEvent<>) => {
    if (event.detail !== 1) {
      event.preventDefault();
    }
  };

  getCursorPosition = (event: SyntheticInputEvent<>) => {
    event.stopPropagation();
    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;
    if (start !== end) {
      return;
    }
    this._cursorPosition = start;
    const selectedBlock = this._getSelectedBlock(start);
    this._selectBlock(selectedBlock);
  };

  createSelection = () => {
    let start, end;
    if (this._cursorPosition < 3) {
      start = 0;
      end = 2;
    } else if (this._cursorPosition < 6) {
      start = 3;
      end = 5;
    } else {
      start = 6;
      end = 10;
    }
    process.nextTick(() => {
      this._input && this._input.setSelectionRange(start, end);
    });
  };

  _handleKeyDown = (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    if (this.checkIfBadKeyDownEvent(event)) {
      return;
    }
    event.preventDefault();
    this._cursorPosition = event.currentTarget.selectionStart;
    if (this.isVerticalArrows(event)) {
      const newDate = this.createNewDate(event);
      this.props.onChange(newDate);
      this.createSelection();
    }
    if (this.isHorizontalArrows(event)) {
      this._moveSelectionBlock(event);
    }
    if (this.isSeparatorKey(event)) {
      this._handleSeparatorKey(event);
    }
    if (event.key === 'Enter') {
      this.props.onSubmit && this.props.onSubmit();
    }
  };

  checkIfBadKeyDownEvent = (
    event: SyntheticKeyboardEvent<HTMLInputElement>
  ) => {
    const AllowedKeys = [
      'Enter',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      '.',
      ',',
      ' '
    ];
    return !AllowedKeys.includes(event.key);
  };

  isVerticalArrows = (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    return event.key === 'ArrowUp' || event.key === 'ArrowDown';
  };

  isHorizontalArrows = (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    return event.key === 'ArrowLeft' || event.key === 'ArrowRight';
  };

  isSeparatorKey = (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    return [' ', ',', '.'].includes(event.key);
  };

  _moveSelectionBlock = event => {
    const currentSelectedBlock = this._getSelectedBlock(this._cursorPosition);
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    const nextSelectedBlock = Math.max(
      Math.min(currentSelectedBlock + step, 2),
      0
    );
    this._selectBlock(nextSelectedBlock);
  };

  _selectBlock = index => {
    const ranges = [[0, 2], [3, 5], [6, 10]];
    const [start, end] = ranges[index];
    setTimeout(() => {
      this._input && this._input.setSelectionRange(start, end);
      this._cursorPosition = start;
    }, 10);
  };

  _handleSeparatorKey = event => {
    const re = /([\d\_]{0,2}).?([\d\_]{0,2}).?([\d\_]{0,4})/;
    if (this._cursorPosition !== 1 && this._cursorPosition !== 4) {
      return;
    }
    const [, day = '', month = '', year = ''] = re.exec(
      this.props.value.replace('_', '')
    );

    let nextValue = [day, month, year]
      .filter(Boolean)
      .map(pad2)
      .join('.');

    if (nextValue.length < 7) {
      nextValue += '.';
    }

    if (this.props.onChange) {
      this.props.onChange(nextValue);
    }
    this._moveSelectionBlock(event);
  };

  _getSelectedBlock = cursorPosition => {
    return cursorPosition < 3 ? 0 : cursorPosition < 6 ? 1 : 2;
  };

  handleDateChange = (event: SyntheticInputEvent<>, value: string) => {
    if (!this.props.withMask) {
      value = value.replace(/[^\d\.]/g, '');
    }
    this.props.onChange(value);
  };

  createNewDate = (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const dateValue = event.currentTarget.value;
    const cursorPosition = event.currentTarget.selectionStart;

    let step = 0;
    if (event.key === 'ArrowUp') {
      step = 1;
    }
    if (event.key === 'ArrowDown') {
      step = -1;
    }

    let [day, month, year] = dateValue.split('.');
    day = Number(day);
    month = Number(month) - 1;
    year = Number(year);

    let date;
    if (cursorPosition < 3) {
      // day
      date = new Date(Date.UTC(year, month, day + step));
    } else if (cursorPosition < 6) {
      // month
      date = new Date(Date.UTC(year, month + step, day));
    } else {
      // year
      date = new Date(Date.UTC(year + step, month, day));
    }
    const newDay = date.getUTCDate();
    const newMonth = date.getUTCMonth() + 1;
    const newYear = date.getUTCFullYear();
    return `${pad2(newDay)}.${pad2(newMonth)}.${newYear}`;
  };

  handleFocus = () => {
    if (this.props.onFocus) {
      this.props.onFocus();
    }
  };

  handleBlur = (e: Event) => {
    this._cursorPosition = 0;

    if (this.props.onBlur) {
      this.props.onBlur(e);
    }
  };

  getInputRef = (ref: ?Input) => {
    this._input = ref;
  };

  getIconRef = (ref: ?HTMLElement) => {
    this._icon = ref;
  };
}

const pad2 = v => v.toString().padStart(2, '0');

function getDaysAmount(year, month) {
  const date = new Date(Date.UTC(year, month, 0));
  return date.getUTCDate();
}
