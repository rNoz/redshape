import React, { Fragment, Component } from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import PlayIcon from 'mdi-react/PlayIcon';
import PauseIcon from 'mdi-react/PauseIcon';
import StopIcon from 'mdi-react/StopIcon';
import Rewind5Icon from 'mdi-react/Rewind5Icon';
import FastForward5Icon from 'mdi-react/FastForward5Icon';
import desktopIdle from 'desktop-idle';
import { Input } from './Input';
import Rewind1Icon from './icons/Rewind1Icon';
import FastForward1Icon from './icons/FastForward1Icon';

import actions from '../actions';

import { GhostButton } from './Button';
import { animationSlideUp } from '../animations';
import Link from './Link';

import { IssueId } from './Issue';

import IPC from '../ipc';

const date = () => moment().format('YYYY-MM-DD HH:mm:ss');

// TODO: may be better to use the powerMonitor module from electron

const ActiveTimer = styled.div`
  animation: ${animationSlideUp} .7s ease-in;
  max-width: 100%;
  box-sizing: border-box;
  padding: 15px 20px;
  position: fixed;
  bottom: 0;
  width: 100%;
  background: ${props => props.theme.bg};
  display: ${props => (props.isEnabled ? 'flex' : 'none')};
  align-items: center;
  box-shadow: 0px -2px 20px ${props => props.theme.bgDark};
  border-top: 2px solid ${props => (props.isEnhanced ? props.theme.main : props.theme.bgDark)};

  div.panel {
    flex-grow: 0;
    min-width: 520px;
    display: flex;
    align-items: center;
    max-width: ${props => (props.showAdvancedTimerControls ? '900px' : '1800px')};
  }

  div.buttons {
    margin: 0 20px;
    display: flex;
  }

  div.time {
    margin: 0 20px;
    font-size: 16px;
    font-weight: bold;
  }

  div.buttons {
    a {
      padding: 5px 0px;

      &:hover {
        background: ${props => props.theme.bgDark};
      }
    }

    a:first-child {
      margin-right: 20px;
    }
  }

  div.buttons.buttons-advanced {
    a {
      margin-right: 5px;
    }
    a:last-child {
      margin-right: initial;
    }
  }

  div.issueName {
    padding: 0 20px;
    max-width: 500px;
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  div.time {
    color: ${props => props.theme.main};
  }

  input[name="comment"] {
    flex-grow: 2;
    margin-left: 20px;
    width: initial;
    border: none;
    border-radius: 0;
    border-bottom: 1px ${props => props.theme.bgDark} solid;
    color: #A4A4A4;
    &:focus {
      border: none;
      border-radius: 0;
      border-bottom: 1px ${props => props.theme.main} solid;
      box-shadow: none;
    }
  }

`;

const StyledButton = styled(GhostButton)`
  padding: 0px;
`;

const MaskedLink = styled(Link)`
  color: inherit;
  padding: 0;
  font-size: 16px;
  font-weight: bold;
  text-decoration: none;
`;

const extractPeriodOption = (period) => {
  if (!period || period === 'none') {
    return;
  }
  return period === '1h' ? 60 : (Number(period.replace('m', '')));
};

let mouseMoveTimer;
const onMouseMove = () => {
  mouseMoveTimer.stopIntervalIdleResumer();
};

/**
 * interval: ticks when window is open, every second
 * intervalIdle: ticks every ~2 minutes to analyze if the system is idle
 * intervalCheckpoint: ticks every X (configurable) minutes to save the state in case the system is suddenly shutdown,
 *   so, we lose those minutes only
 */
class Timer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.trackedTime || props.initialValue || 0,
      timestamp: null, // used only when store/restore to/from timestamp (window hidden)
      comments: props.trackedComments || '',
    };

    IPC.setupTimer(this);

    const {
      isEnabled, isPaused, trackedIssue, actionDate
    } = this.props;
    if (isEnabled) {
      IPC.send('timer-info', {
        isEnabled, isPaused, issue: trackedIssue, actionDate
      });
    }

    if (isEnabled && !isPaused) {
      this.interval = setInterval(this.tick, 1000);
      this.setIntervalIdle();
    } else {
      this.interval = undefined;
    }
  }

  pauseByIdle(idleTime) {
    this.stopIntervalIdle();
    let discardedMessage = '';
    if (this.props.idleTimeDiscard) {
      const { value } = this.state;
      const min = 0;
      const nvalue = value - idleTime;
      if (nvalue > min) {
        this.setState({ value: nvalue });
      }
      discardedMessage = '(discarded from timer)';
    }
    this.onPause();
    IPC.send('notify', { message: `Timer is paused because the system was idle for ${(idleTime / (60 * 1000)).toFixed(2)} minutes ${discardedMessage}`, critical: true, keep: true });
    this.setIntervalIdleResumer();
  }

  resetIntervalIdle() {
    if (this.intervalIdle) {
      this.stopIntervalIdle();
      this.setIntervalIdle();
      this.stopIntervalCheckpoint();
      this.stopIntervalIdleResumer();
    }
  }

  stopIntervalIdleResumer() {
    if (this.intervalIdleResumer) {
      clearInterval(this.intervalIdleResumer);
      this.intervalIdleResumer = null;
      mouseMoveTimer = null;
      window.removeEventListener('mousemove', onMouseMove);
    }
  }

  setIntervalIdleResumer() {
    const { idleBehavior } = this.props;
    const idleMinutes = extractPeriodOption(idleBehavior);
    if (!idleMinutes) {
      return;
    }

    const checkTime = 1 * 60;
    const maxIdleTime = idleMinutes * 60;
    // Check if system is not idle and user should be warned
    this.intervalIdleResumer = setInterval(() => {
      if (!this.intervalIdleResumer) {
        this.stopIntervalIdleResumer();
        return;
      }
      const idle = desktopIdle.getIdleTime();
      if (idle < (maxIdleTime)) {
        IPC.send('notify', { message: 'Timer was paused and you are here again. Remember to resume it.', critical: false });
        this.stopIntervalIdleResumer();
      }
    }, checkTime * 1000);
    mouseMoveTimer = this;
    window.addEventListener('mousemove', onMouseMove);
  }

  setIntervalIdle() {
    const { idleBehavior } = this.props;
    const idleMinutes = extractPeriodOption(idleBehavior);
    if (!idleMinutes) {
      return;
    }

    const checkTime = 2 * 60; // every 2 minute
    const warnTime = 15; // at least for 15 s.
    const maxIdleTime = idleMinutes * 60;
    let warningIdle = false;
    this.intervalIdle = setInterval(() => {
      if (warningIdle) { return; }
      const idle = desktopIdle.getIdleTime();
      if (idle > (maxIdleTime)) {
        IPC.send('notify', { message: `Timer will be paused if system continues idle for another ${warnTime} seconds.`, critical: true });
        warningIdle = true;
        this.timeoutIdle = setTimeout(() => {
          const idle = desktopIdle.getIdleTime();
          if (idle > (maxIdleTime)) {
            this.pauseByIdle(Number(idle.toFixed(0)) * 1000);
          } else {
            warningIdle = false;
          }
        }, warnTime * 1000);
      }
    }, checkTime * 1000);
  }

  setIntervalCheckpoint(ts, topic) {
    const { timerCheckpoint } = this.props;
    const checkpointMinutes = extractPeriodOption(timerCheckpoint);
    if (!checkpointMinutes) {
      return;
    }

    this.intervalCheckpoint = setInterval(() => {
      const { isEnabled, isPaused, saveTimer } = this.props;
      const { timestamp } = this.state;
      if (isEnabled) {
        if (!isPaused) {
          if (timestamp) {
            this.restoreFromTimestamp(false);
            saveTimer(this.state.value, this.state.comments);
            this.storeToTimestamp();
          } else {
            saveTimer(this.state.value, this.state.comments);
          }
        }
      } else {
        this.stopIntervalCheckpoint();
      }
    }, checkpointMinutes * 60 * 1000);
  }

  /* check if is using the optimization now */
  isTimestamped() {
    return this.state.timestamp != null;
  }

  /* stop time interval and store tracked time + current datetime */
  storeToTimestamp() {
    const { timestamp } = this.state;
    const {
      isEnabled, isPaused, trackedIssue, actionDate
    } = this.props;
    if (isEnabled && !isPaused) {
      this.setState({
        timestamp: {
          value: this.state.value,
          datetime: moment()
        }
      });
      this.stopInterval();
    }
    IPC.send('timer-info', {
      isEnabled, isPaused, issue: trackedIssue, actionDate
    });
  }

  /* restore time interval based on stored tracked time + diff datetimes */
  restoreFromTimestamp(enableInterval = true) {
    const { timestamp } = this.state;
    const { isEnabled, isPaused } = this.props;
    if (timestamp && isEnabled && !isPaused) {
      const { value, datetime } = timestamp;
      const newValue = moment().diff(datetime, 'ms') + value;
      this.setState({ timestamp: null, value: newValue });
      if (enableInterval) {
        this.interval = setInterval(this.tick, 1000);
      }
    }
  }

  tick = () => {
    const { value } = this.state;
    this.setState({ value: value + 1000 });
  }

  stopInterval = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  stopIntervalIdle = () => {
    if (this.intervalIdle) {
      clearInterval(this.intervalIdle);
      this.intervalIdle = undefined;
      if (this.timeoutIdle) {
        clearTimeout((this.timeoutIdle));
        this.timeoutIdle = undefined;
      }
    }
  }

  stopIntervalCheckpoint = () => {
    if (this.intervalCheckpoint) {
      clearInterval(this.intervalCheckpoint);
      this.intervalCheckpoint = undefined;
    }
  }

  stopIntervals() {
    this.stopInterval();
    this.stopIntervalIdle();
    this.stopIntervalCheckpoint();
    this.stopIntervalIdleResumer();
  }

  cleanup = () => {
    const { isEnabled, isPaused, saveTimer } = this.props;
    if (isEnabled) {
      if (!isPaused) {
        this.onPause();
      } else {
        saveTimer(this.state.value, this.state.comments);
      }
    }
    this.stopIntervals();
    window.removeEventListener('beforeunload', this.cleanup);
  }

  saveState = () => {
    const { isEnabled, saveTimer } = this.props;
    if (isEnabled) {
      saveTimer(this.state.value, this.state.comments);
    }
  }

  componentWillMount() {
    window.addEventListener('beforeunload', this.cleanup);
  }

  componentWillUnmount() {
    this.saveState();
    this.stopIntervals();
  }

  componentDidUpdate(oldProps) {
    const {
      isEnabled, isPaused, trackedIssue, actionDate
    } = this.props;
    if (isEnabled !== oldProps.isEnabled) {
      this.stopIntervals();
      // if was disabled, but now is enabled
      if (isEnabled) {
        this.interval = setInterval(this.tick, 1000);
        this.setIntervalIdle();
        if (!isPaused) {
          this.setIntervalCheckpoint();
        }
        IPC.send('timer-info', {
          isEnabled, isPaused, issue: trackedIssue, actionDate
        });
      }
      // otherwise, if was enabled, but now it's disabled, we don't do anything
      // because the interval was already cleared above
    }
  }

  onPause = () => {
    this.stopIntervals();
    const { onPause, trackedIssue, pauseTimer } = this.props;
    const { value, comments } = this.state;
    const actionDate = date();
    pauseTimer(value, comments, actionDate);
    if (onPause) {
      onPause(trackedIssue, value, comments);
    }
    IPC.send('timer-info', {
      isEnabled: true, isPaused: true, issue: trackedIssue, actionDate
    });
  }

  onContinue = () => {
    this.interval = setInterval(this.tick, 1000);
    this.setIntervalIdle();
    if (!this.intervalCheckpoint) {
      this.setIntervalCheckpoint();
    }
    const { onContinue, trackedIssue, continueTimer } = this.props;
    const { value, comments } = this.state;
    const actionDate = date();
    continueTimer(value, comments, actionDate);
    if (onContinue) {
      onContinue(trackedIssue, value, comments);
    }
    IPC.send('timer-info', {
      isEnabled: true, isPaused: false, issue: trackedIssue, actionDate
    });
  }

  onStop = () => {
    this.stopIntervals();
    const { value, comments } = this.state;
    const { onStop, trackedIssue, stopTimer } = this.props;
    stopTimer(value, comments);
    if (onStop) {
      onStop(trackedIssue, value, comments);
    }
    this.setState({ value: 0, comments: '' });
    IPC.send('timer-info', { isEnabled: false, issue: trackedIssue });
  }

  onBackward = (minutes) => {
    const { value } = this.state;
    const min = 0;
    let nvalue = value - (minutes * 60 * 1000);
    nvalue = nvalue < min ? 0 : nvalue;
    this.setState({ value: nvalue });
    this.props.saveTimer(nvalue, this.state.comments);
  }

  onForward = (minutes) => {
    const { value } = this.state;
    const max = 24 * 3600 * 1000;
    const nvalue = value + (minutes * 60 * 1000);
    if (nvalue < max) {
      this.setState({ value: nvalue });
    }
    this.props.saveTimer(nvalue, this.state.comments);
  }

  redirectToTrackedLink = (event) => {
    event.preventDefault();
    this.props.history.push(`/app/issue/${this.props.trackedIssue.id}`);
  }

  componentWillReceiveProps(newProps) {
    const { trackedTime, trackedComments } = newProps;
    this.setState({ value: trackedTime, comments: trackedComments });
  }

  onCommentsChange = (ev) => {
    this.setState({ comments: ev.target.value });
  }

  render() {
    const { value, comments } = this.state;
    const {
      isEnabled, trackedIssue, isPaused, showAdvancedTimerControls, uiStyle
    } = this.props;
    const isEnhanced = uiStyle === 'enhanced';
    const timeString = moment.utc(value).format('HH:mm:ss');
    return (
      <Fragment>
        <ActiveTimer isEnabled={isEnabled} isEnhanced={isEnhanced}>
          <div className="panel">
            <div className="buttons">
              <StyledButton
                onClick={this.onStop}
              >
                <StopIcon size={35} />
              </StyledButton>
              { isPaused && (
                <StyledButton
                  onClick={this.onContinue}
                >
                  <PlayIcon size={35} />
                </StyledButton>
              )
              }
              { !isPaused && (
                <StyledButton
                  onClick={this.onPause}
                >
                  <PauseIcon size={35} />
                </StyledButton>
              )
              }
            </div>
            <div className="issueName">
              { isEnabled && isEnhanced && (
              <IssueId
                value={trackedIssue.id}
                tracker={trackedIssue.tracker.id}
                fontSize="16px"
                clickable={true}
                onClick={this.redirectToTrackedLink}
              />
              ) }
              { (isEnabled
                ? (
                  <MaskedLink
                    href="#"
                    onClick={this.redirectToTrackedLink}
                  >
                    {trackedIssue.subject}
                  </MaskedLink>
                )
                : null)}
            </div>
            <div className="time">
              <span>{timeString}</span>
            </div>
            { showAdvancedTimerControls && (
              <div className="buttons buttons-advanced">
                { (
                  <StyledButton
                    onClick={() => this.onBackward(5)}
                  >
                    <Rewind5Icon size={25} />
                  </StyledButton>
                )
                }
                { (
                  <StyledButton
                    onClick={() => this.onBackward(1)}
                  >
                    <Rewind1Icon size={25} />
                  </StyledButton>
                )
                }
                { (
                  <StyledButton
                    onClick={() => this.onForward(1)}
                  >
                    <FastForward1Icon size={25} />
                  </StyledButton>
                )
                }
                { (
                  <StyledButton
                    onClick={() => this.onForward(5)}
                  >
                    <FastForward5Icon size={25} />
                  </StyledButton>
                )
                }
              </div>
            )}
          </div>
          { showAdvancedTimerControls && (
            <Input
              type="text"
              name="comment"
              value={comments}
              onChange={this.onCommentsChange}
              onBlur={this.saveState}
              maxLength={255}
            />
          )}
        </ActiveTimer>
      </Fragment>
    );
  }
}

Timer.propTypes = {
  isEnabled: PropTypes.bool,
  isPaused: PropTypes.bool,
  initialValue: PropTypes.number,
  trackedIssue: PropTypes.shape({
    id: PropTypes.number.isRequired,
    subject: PropTypes.string.isRequired,
    author: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    project: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    activity: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired
  }).isRequired,
  trackedTime: PropTypes.number,
  trackedComments: PropTypes.string,
  onStop: PropTypes.func,
  onPause: PropTypes.func,
  onContinue: PropTypes.func,
  pauseTimer: PropTypes.func.isRequired,
  continueTimer: PropTypes.func.isRequired,
  stopTimer: PropTypes.func.isRequired,
  actionDate: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  idleBehavior: PropTypes.string.isRequired,
  idleTimeDiscard: PropTypes.bool.isRequired,
  showAdvancedTimerControls: PropTypes.bool.isRequired,
  uiStyle: PropTypes.string.isRequired,
  timerCheckpoint: PropTypes.string.isRequired,
};

Timer.defaultProps = {
  initialValue: 0,
  isEnabled: false,
  isPaused: false,
  issueTitle: ''
};

const mapStateToProps = state => ({
  isEnabled: state.tracking.isEnabled,
  isPaused: state.tracking.isPaused,
  trackedTime: state.tracking.duration,
  trackedIssue: state.tracking.issue,
  trackedComments: state.tracking.comments,
  actionDate: state.tracking.actionDate,
  idleBehavior: state.settings.idleBehavior,
  idleTimeDiscard: state.settings.idleTimeDiscard,
  showAdvancedTimerControls: state.settings.showAdvancedTimerControls,
  uiStyle: state.settings.uiStyle,
  timerCheckpoint: state.settings.timerCheckpoint,
});

const mapDispatchToProps = dispatch => ({
  pauseTimer: (duration, comments, actionDate) => dispatch(actions.tracking.trackingPause(duration, comments, actionDate)),
  continueTimer: (duration, comments, actionDate) => dispatch(actions.tracking.trackingContinue(duration, comments, actionDate)),
  stopTimer: (duration, comments) => dispatch(actions.tracking.trackingStop(duration, comments)),
  saveTimer: (duration, comments) => dispatch(actions.tracking.trackingSave(duration, comments)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Timer);
