import React from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';

const StyledTextArea = styled.textarea`
  font-size: 14px;
  resize: none;
  overflow: hidden;
  height: auto;
  font-family: inherit;
  width: 100%;
  line-height: 1.5rem;
  box-sizing: border-box;
  background: ${props => props.theme.bg};

  ${props => props.disabled && css`
    background: ${props.theme.bgDisabled};
    border-color: ${props.theme.bgDarker} !important;
    color: ${props.theme.minorText};

    &:hover {
      border-color: ${props.theme.bgDarker} !important;
    }
  `}
`;

const TextArea = ({
  name,
  onChange,
  rows,
  disabled,
  id,
  value,
  className,
  maxLength,
  forwardedRef,
  onKeyDown,
  onBlur,
  onFocus,
}) => (
  <StyledTextArea
    ref={forwardedRef}
    name={name}
    onChange={onChange}
    rows={rows}
    maxLength={maxLength}
    disabled={disabled}
    id={id}
    className={className}
    value={value}
    onKeyDown={onKeyDown}
    onBlur={onBlur}
    onFocus={onFocus}
  />
);

TextArea.propTypes = {
  name: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  onChange: PropTypes.func.isRequired,
  rows: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  disabled: PropTypes.bool,
  id: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  className: PropTypes.string,
  value: PropTypes.string,
  maxLength: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]),
  forwardedRef: PropTypes.object,
  onKeyDown: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
};

TextArea.defaultProps = {
  name: undefined,
  rows: 1,
  disabled: false,
  maxLength: undefined,
  id: undefined,
  className: undefined,
  value: undefined,
  forwardedRef: undefined
};

export default React.forwardRef((props, ref) => <TextArea forwardedRef={ref} {...props} />);
