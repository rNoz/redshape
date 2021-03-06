import _debounce from 'lodash/debounce';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import styled, { withTheme } from 'styled-components';

import ClockIcon from 'mdi-react/ClockIcon';
import HelpCircleIcon from 'mdi-react/HelpCircleIcon';
import Select from 'react-select';
import RawSlider from 'rc-slider';
import { Input, Label } from './Input';
import Button from './Button';
import ErrorMessage from './ErrorMessage';
import Modal from './Modal';
import ProcessIndicator from './ProcessIndicator';
import Tooltip from './Tooltip';
import DatePicker from './DatePicker';


import 'rc-slider/assets/index.css';
import './styles/rc-slider.css';

import 'rc-slider/assets/index.css';
import actions from '../actions';

import { durationToHours, hoursToDuration } from '../datetime';
import CustomFields from './CustomFields';
import MarkdownEditor from './MarkdownEditor';

const FlexRow = styled.div`

`;

const Slider = RawSlider;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 250px 250px;
  grid-column-gap: 40px;
`;
const GridRow = styled.div`
  grid-column: 1 / -1;
`;

const inputStyle = { width: 250, minHeight: 38 };

const OptionButtons = styled.div`
  position: relative;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid ${props => props.theme.bgDark};
  display: flex;
  justify-content: space-between;

  button {
    padding: 8px 15px;
  }

  div {
    margin-left: 20px;
  }
`;

const Notification = styled.div`
  align-self: center;
  opacity: 0;
  transition: opacity 1.5s ease-in-out;
  color: ${props => props.theme.green};

  &.show {
    opacity: 1;
  }
`;

class NotificationWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show: false
    };
    this.t = setTimeout(() => {
      this.setState({ show: true });
    }, 100);
  }

  render() {
    const { show } = this.state;
    return (<Notification className={show && 'show'}>Review if any field needs to be updated</Notification>);
  }
}

const Title = styled.h4`
  margin: 0;
  font-size: 1rem;
`;

const ProgressInput = styled.div`
  background: #EFEFEF;
  border: 1px solid #A0A0A0;
  height: 38px;
  width: 538px;
  display: flex;
  justify-content: left;
  align-items: center;
  border-radius: 3px;
`;
const Progress = styled.div`
  background: white;
  border-right: 1px solid #A0A0A0;
  padding: 0 15px;
  height: 100%;
  display: flex;
  align-items: center;
  border-radius: 3px;
`;
const FieldAdjacentInfo = styled.div`
  align-self: center;
  color: gray;
  width: 100%;
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
`;
const DurationInfo = styled.div`
  color: gray;

  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 87px;
  height: 36px;
  border: 1px solid #A0A0A0;
  border-radius: 0 3px 3px 0;
  border-left: 0;
  margin-left: -1px;
  &[disabled] {
    border-color: #E9E9E9;
  }
`;
const CombinedInput = styled.div`
  background: #EFEFEF;
  height: 36px;
  display: flex;
  justify-content: left;
  align-items: center;
  border-radius: 3px;
`;

const ClockIconStyled = styled(ClockIcon)`
  padding-bottom: 1px;
`;
const HelpIconStyled = styled(HelpCircleIcon)`
  padding-bottom: 1px;
`;
const LabelIcon = styled.span`
  margin-left: 0.2rem;
  color: #A0A0A0;
`;
const DurationIcon = (<LabelIcon><Tooltip text="hours (3.23) or durations (3h 14m, 194 mins)"><ClockIconStyled size={14} /></Tooltip></LabelIcon>);

const compSelectStyles = {
  container: (base, state) => ({
    ...base, minWidth: 250, maxWidth: 250, borderColor: state.isDisabled ? '#E9E9E9' : '#A0A0A0'
  }),
  control: (base, state) => ({ ...base, borderColor: state.isDisabled ? '#E9E9E9' : '#A0A0A0' }),
};

const extractFromTransitions = (transitions, key, extra = {}) => {
  const list = transitions && transitions[key];
  let values;
  if (list) {
    if (key === 'assigned_to') {
      let meFound = false;
      const { myId } = extra;
      values = list.sort((a, b) => a.lastname.localeCompare(b.lastname))
        .map((el) => {
          if (el.id === myId) {
            meFound = true;
          }
          return {
            value: el.id,
            label: `${el.firstname} ${el.lastname}`
          };
        });
      if (meFound) {
        values.splice(0, 0, { value: myId, label: '<< Me >>' });
      }
    } else {
      values = list.sort((a, b) => a.position - b.position)
        .map(el => ({
          value: el.id,
          label: el.name
        }));
    }
  }
  return values;
};

class IssueModal extends Component {
  constructor(props) {
    super(props);
    const propsIssueEntry = props.issueEntry;
    let issueEntry = { customFieldsMap: {} };
    let statusTransitions;
    let priorityTransitions;
    let assignedToTransitions;
    let customFieldsMap;
    if (propsIssueEntry) {
      const {
        estimated_hours, done_ratio, due_date, children, transitions, status, priority, custom_fields, description, assigned_to, subject
      } = propsIssueEntry;
      statusTransitions = extractFromTransitions(transitions, 'status');
      priorityTransitions = extractFromTransitions(transitions, 'priority');
      assignedToTransitions = extractFromTransitions(transitions, 'assigned_to', { myId: props.userId });
      customFieldsMap = custom_fields ? Object.fromEntries(custom_fields.map(el => [el.name, el.value])) : {};
      issueEntry = {
        estimated_duration: hoursToDuration(estimated_hours),
        progress: done_ratio,
        due_date: due_date || '',
        children: children ? children.length : 0,
        ...(statusTransitions && { status: { value: status.id, label: status.name } }),
        ...(priorityTransitions && { priority: { value: priority.id, label: priority.name } }),
        ...(assignedToTransitions && assigned_to && { assigned_to: { value: assigned_to.id, label: assigned_to.name } }),
        customFieldsMap: {
          ...customFieldsMap
        },
        description,
        subject
      };
    }
    this.state = {
      issueEntry,
      instance: new Date().getTime(),
      progress_info: issueEntry.progress || 0,
      wasModified: false,
      statusTransitions,
      priorityTransitions,
      assignedToTransitions,
      notification: props.notification
    };

    this.debouncedDescriptionChange = _debounce(this.onDescriptionChange, 300);
  }

  componentDidUpdate(oldProps) {
    if (oldProps.isOpen !== this.props.isOpen && this.props.isOpen) {
      const { issueEntry } = this.props;

      if (issueEntry) {
        const {
          estimated_hours, done_ratio, due_date, children, transitions, status, priority, custom_fields, description, assigned_to, subject
        } = issueEntry;
        const statusTransitions = extractFromTransitions(transitions, 'status');
        const priorityTransitions = extractFromTransitions(transitions, 'priority');
        const assignedToTransitions = extractFromTransitions(transitions, 'assigned_to', { myId: this.props.userId });
        const customFieldsMap = custom_fields ? Object.fromEntries(custom_fields.map(el => [el.name, el.value])) : {};
        this.setState({
          issueEntry: {
            estimated_duration: hoursToDuration(estimated_hours),
            progress: done_ratio,
            due_date: due_date || '',
            children: children ? children.length : 0,
            ...(statusTransitions && { status: { value: status.id, label: status.name } }),
            ...(priorityTransitions && { priority: { value: priority.id, label: priority.name } }),
            ...(assignedToTransitions && assigned_to && { assigned_to: { value: assigned_to.id, label: assigned_to.name } }),
            customFieldsMap: {
              ...customFieldsMap
            },
            description,
            subject
          },
          instance: new Date().getTime(),
          progress_info: done_ratio,
          wasModified: false,
          statusTransitions,
          priorityTransitions,
          assignedToTransitions,
          notification: this.props.notification
        });
      }
    } else if (oldProps.isOpen !== this.props.isOpen && !this.props.isOpen) {
      this.props.resetValidation();
    }
  }

  componentWillUnmount() {
    this.props.resetValidation();
  }

  runValidation = (checkFields) => {
    const { validateBeforeUpdate } = this.props;
    const { issueEntry } = this.state;

    validateBeforeUpdate({
      progress: issueEntry.progress,
      estimated_duration: issueEntry.estimated_duration,
      due_date: issueEntry.due_date,
      subject: issueEntry.subject,
    }, checkFields);
  }

  onClose = () => {
    this.setState({
      issueEntry: {
        customFieldsMap: {}
      }
    });
    this.props.onClose();
  }

  onUpdate = () => {
    const { wasModified, issueEntry } = this.state;
    if (wasModified) {
      const extra = {
        isStrictWorkflow: this.props.isStrictWorkflow,
      };
      this.props.updateIssueEntry(this.props.issueEntry, issueEntry, extra)
        .then((ret) => {
          if (!this.props.issue.error) {
            const unchanged = ret && ret.unchanged;
            if (!unchanged) {
              this.props.issueGet(this.props.issueEntry.id);
            }
            this.onClose();
          }
        });
    } else {
      this.onClose();
    }
  }

  onDescriptionChange = description => this.setState({
    issueEntry: {
      ...this.state.issueEntry,
      description
    },
    wasModified: true
  });

  onDueDateChange = date => this.setState({
    issueEntry: {
      ...this.state.issueEntry,
      due_date: date != null ? date.toISOString().split('T')[0] : null,
    },
    wasModified: true
  });

  onProgressChange = (progress) => {
    this.setState({
      issueEntry: {
        ...this.state.issueEntry,
        progress,
      },
      wasModified: true
    });
  }

  onEstimatedDurationChange = ({ target: { value } }) => {
    value = `${value}`;
    this.setState({
      issueEntry: {
        ...this.state.issueEntry,
        estimated_duration: value.replace(',', '.'),
      },
      wasModified: true
    });
  }

  onSubjectChange = ({ target: { value } }) => {
    this.setState({
      issueEntry: {
        ...this.state.issueEntry,
        subject: value
      },
      wasModified: true
    });
  }

  onStatusChange = (status) => {
    this.setState({
      issueEntry: {
        ...this.state.issueEntry,
        status,
      },
      wasModified: true
    });
  }

  onPriorityChange = (priority) => {
    this.setState({
      issueEntry: {
        ...this.state.issueEntry,
        priority,
      },
      wasModified: true
    });
  }

  onAssignedToChange = (assigned_to) => {
    this.setState({
      issueEntry: {
        ...this.state.issueEntry,
        assigned_to,
      },
      wasModified: true
    });
  }

  onFieldChange = (name, value) => {
    const { issueEntry } = this.state;
    const { customFieldsMap } = issueEntry;
    const newState = {
      issueEntry: {
        ...issueEntry,
      },
      wasModified: true
    };
    newState.issueEntry.customFieldsMap = {
      ...customFieldsMap,
      [name]: value
    };
    this.setState(newState);
  }

  getErrorMessage = (error) => {
    if (!error) return null;
    return error.message.replace(new RegExp(error.context.key, 'g'), error.path[0]);
  }

  render() {
    const {
      isUserAuthor, isOpen, isEditable, theme, issue, issueEntry: propsIssueEntry, progressSlider, isIssueAlwaysEditable
    } = this.props;
    const {
      issueEntry, wasModified, progress_info, instance, statusTransitions, priorityTransitions, assignedToTransitions, notification
    } = this.state;
    const {
      progress, estimated_duration, due_date, children, status, priority, customFieldsMap, description, assigned_to, subject
    } = issueEntry;
    const validationErrors = issue.error && issue.error.isJoi
      ? {
        progress: issue.error.details.find(error => error.path[0] === 'progress'),
        estimated_duration: issue.error.details.find(error => error.path[0] === 'estimated_duration'),
        due_date: issue.error.details.find(error => error.path[0] === 'due_date'),
        status: issue.error.details.find(error => error.path[0] === 'status'),
        priority: issue.error.details.find(error => error.path[0] === 'priority'),
        assigned_to: issue.error.details.find(error => error.path[0] === 'assigned_to'),
        subject: issue.error.details.find(error => error.path[0] === 'subject'),
      }
      : {};
    let estimatedDurationInfo = '';
    if (estimated_duration) {
      const hours = durationToHours(estimated_duration);
      if (hours > 0) {
        estimatedDurationInfo = `${Number(hours.toFixed(2))} hours`;
      }
    }
    const progressInfo = `${progress_info.toFixed(0)}%`;
    const disableField = isIssueAlwaysEditable ? false : (!isEditable || !isUserAuthor);
    const { author } = propsIssueEntry;
    const tooltipIssueModal = "- Parent tasks cannot edit 'Progress' and 'Due date'.\n- 'Status', 'Priority', 'Assignee' and Custom Fields need server-side support (plugins).\n- Wrong permissions may show an error or not update the issue.";
    const progressSliderStep = progressSlider && Number(progressSlider.replace('%', ''));
    return (
      <Modal
        width={540}
        open={!!isOpen}
        onClose={this.onClose}
        needConfirm={wasModified}
        center={true}
      >
        <Title>
          Edit issue
          <LabelIcon><Tooltip position="right" text={tooltipIssueModal}><HelpIconStyled size={14} /></Tooltip></LabelIcon>
        </Title>
        <Grid>
          <Label htmlFor="author" label="Author">
            <div name="author">{author.name}</div>
          </Label>
          {
            assignedToTransitions ? (
              <div>
                <Label htmlFor="assignee" label="Assignee">
                  <FlexRow>
                    <Select
                      name="assignee"
                      options={assignedToTransitions}
                      styles={compSelectStyles}
                      value={assigned_to || undefined}
                      onChange={this.onAssignedToChange}
                      isClearable={true}
                      isDisabled={disableField}
                      theme={defaultTheme => ({
                        ...defaultTheme,
                        borderRadius: 3,
                        colors: {
                          ...defaultTheme.colors,
                          primary: theme.main,
                        },
                      })
                      }
                    />
                  </FlexRow>
                  <ErrorMessage show={!!validationErrors.assigned_to}>
                    {this.getErrorMessage(validationErrors.assigned_to)}
                  </ErrorMessage>
                </Label>
              </div>
            ) : (
              <Label htmlFor="assignee" label="Assignee">
                <div name="assignee">{propsIssueEntry.assigned_to && propsIssueEntry.assigned_to.name}</div>
              </Label>
            )
          }
        </Grid>
        <Label htmlFor="issue" label={`Issue #${propsIssueEntry.id}`}>
          <Input
            style={{ ...inputStyle, width: 540 }}
            type="text"
            name="issue"
            value={subject}
            onChange={this.onSubjectChange}
            onBlur={() => this.runValidation(['subject'])}
            disabled={disableField}
          />
          <ErrorMessage show={!!validationErrors.subject}>
            {this.getErrorMessage(validationErrors.subject)}
          </ErrorMessage>
        </Label>
        <Grid>
          {
            statusTransitions ? (
              <div>
                <Label htmlFor="status" label="Status">
                  <FlexRow>
                    <Select
                      name="status"
                      options={statusTransitions}
                      styles={compSelectStyles}
                      value={status}
                      onChange={this.onStatusChange}
                      isClearable={false}
                      isDisabled={disableField}
                      theme={defaultTheme => ({
                        ...defaultTheme,
                        borderRadius: 3,
                        colors: {
                          ...defaultTheme.colors,
                          primary: theme.main,
                        },
                      })
                      }
                    />
                  </FlexRow>
                  <ErrorMessage show={!!validationErrors.status}>
                    {this.getErrorMessage(validationErrors.status)}
                  </ErrorMessage>
                </Label>
              </div>
            ) : (
              <Label htmlFor="status" label="Status">
                <div name="status">{propsIssueEntry.status && propsIssueEntry.status.name}</div>
              </Label>
            )
          }
          {
            priorityTransitions ? (
              <div>
                <Label htmlFor="priority" label="Priority">
                  <FlexRow>
                    <Select
                      name="priority"
                      options={priorityTransitions}
                      styles={compSelectStyles}
                      value={priority}
                      onChange={this.onPriorityChange}
                      isClearable={false}
                      isDisabled={disableField}
                      theme={defaultTheme => ({
                        ...defaultTheme,
                        borderRadius: 3,
                        colors: {
                          ...defaultTheme.colors,
                          primary: theme.main,
                        },
                      })
                    }
                    />
                  </FlexRow>
                  <ErrorMessage show={!!validationErrors.priority}>
                    {this.getErrorMessage(validationErrors.priority)}
                  </ErrorMessage>
                </Label>
              </div>
            ) : (
              <Label htmlFor="priority" label="Priority">
                <div name="priority">{propsIssueEntry.priority && propsIssueEntry.priority.name}</div>
              </Label>
            )
          }
          <div>
            <Label htmlFor="estimated_duration" label="Estimation" rightOfLabel={DurationIcon}>
              <FlexRow>
                <CombinedInput>
                  <Input
                    style={{ ...inputStyle, width: 163 }}
                    type="text"
                    name="estimated_duration"
                    value={estimated_duration}
                    onBlur={() => this.runValidation(['estimated_duration'])}
                    disabled={disableField}
                    onChange={this.onEstimatedDurationChange}
                  />
                  <DurationInfo>{estimatedDurationInfo}</DurationInfo>
                </CombinedInput>
              </FlexRow>
            </Label>
            <ErrorMessage show={!!validationErrors.estimated_duration}>
              {this.getErrorMessage(validationErrors.estimated_duration)}
            </ErrorMessage>
          </div>
          {
              !children && (
              <div>
                <Label htmlFor="due_date" label="Due date">
                  <DatePicker
                    style={inputStyle}
                    key={instance}
                    name="due_date"
                    value={due_date}
                    isDisabled={disableField}
                    onChange={value => this.onDueDateChange(value) && this.runValidation('due_date')}
                  />
                </Label>
                <ErrorMessage show={!!validationErrors.due_date}>
                  {this.getErrorMessage(validationErrors.due_date)}
                </ErrorMessage>
              </div>
              )}
          {
            !children && (
            <GridRow>
              <Label htmlFor="progress" label="Progress">
                <FlexRow>
                  <ProgressInput>
                    <Progress>
                      <Slider
                        style={{ width: 470 }}
                            // bugfix: avoid sloppy dragging (value/onChange) using this key
                        key={instance}
                        name="progress"
                        tipProps={{ placement: 'right' }}
                        handleStyle={{ borderColor: theme.green }}
                        onChange={value => this.setState({ progress_info: value, wasModified: true })}
                        trackStyle={{ backgroundColor: theme.green }}
                        tipFormatter={value => `${value}%`}
                        min={0}
                        max={100}
                        step={progressSliderStep || 10}
                        defaultValue={progress}
                        disabled={disableField}
                        onAfterChange={value => this.onProgressChange(value) && this.runValidation('progress')}
                      />
                    </Progress>
                    <FieldAdjacentInfo>{progressInfo}</FieldAdjacentInfo>
                  </ProgressInput>
                </FlexRow>
              </Label>
              <ErrorMessage show={!!validationErrors.progress}>
                {this.getErrorMessage(validationErrors.progress)}
              </ErrorMessage>
            </GridRow>
            )
          }
          <CustomFields
            type="issue"
            customFieldsMap={customFieldsMap}
            isDisabled={disableField}
            onChange={this.onFieldChange}
          />
        </Grid>
        <Label label="Description" htmlFor="description">
          <MarkdownEditor
            isDisabled={disableField}
            onChange={this.debouncedDescriptionChange}
            initialValue={description}
          />
        </Label>
        <OptionButtons>
          <Button
            id="btn-update"
            onClick={this.onUpdate}
            disabled={issue.isFetching}
            palette="success"
          >
              Submit
          </Button>
          { issue.isFetching && (<ProcessIndicator />) }
          { notification && <NotificationWrapper /> }
        </OptionButtons>
      </Modal>
    );
  }
}

IssueModal.propTypes = {
  isUserAuthor: PropTypes.bool.isRequired,
  issue: PropTypes.shape({
    isFetching: PropTypes.bool.isRequired,
    error: PropTypes.instanceOf(Error)
  }).isRequired,
  issueEntry: PropTypes.shape({
    id: PropTypes.number.isRequired,
    subject: PropTypes.string.isRequired,
    journals: PropTypes.arrayOf(PropTypes.object).isRequired,
    description: PropTypes.string,
    project: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    priority: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    assigned_to: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }),
    done_ratio: PropTypes.number.isRequired,
    start_date: PropTypes.string.isRequired,
    due_date: PropTypes.string.isRequired,
    estimated_hours: PropTypes.number,
    estimated_duration: PropTypes.string,
    spent_hours: PropTypes.number,
    tracker: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    status: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    author: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    custom_fields: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired
    })),
    tags: PropTypes.arrayOf(PropTypes.string.isRequired),
    transitions: PropTypes.shape({
      status: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        position: PropTypes.number.isRequired,
      })),
      priority: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        position: PropTypes.number.isRequired,
      })),
      assigned_to: PropTypes.shape({
        id: PropTypes.number.isRequired,
        firstname: PropTypes.string.isRequired,
        lastname: PropTypes.string.isRequired,
        name: PropTypes.string
      }),
    }),
  }),
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  isEditable: PropTypes.bool,
  issueGet: PropTypes.func.isRequired,
  updateIssueEntry: PropTypes.func.isRequired,
  validateBeforeUpdate: PropTypes.func.isRequired,
  resetValidation: PropTypes.func.isRequired,
  progressSlider: PropTypes.string.isRequired,
  isIssueAlwaysEditable: PropTypes.bool.isRequired,
  userId: PropTypes.number.isRequired,
  isStrictWorkflow: PropTypes.bool.isRequired,
};

const mapStateToProps = state => ({
  issue: state.issue,
  progressSlider: state.settings.progressSlider,
  isIssueAlwaysEditable: state.settings.isIssueAlwaysEditable,
  fieldsData: state.fields.data,
  userId: state.user.id,
  isStrictWorkflow: state.settings.isStrictWorkflow,
});

const mapDispatchToProps = dispatch => ({
  issueGet: id => dispatch(actions.issues.get(id)),
  updateIssueEntry: (issueEntry, changes, extra) => dispatch(actions.issue.update(issueEntry, changes, extra)),
  validateBeforeUpdate: (changes, checkFields) => dispatch(actions.issue.validateBeforeUpdate(changes, checkFields)),
  resetValidation: () => dispatch(actions.issue.reset())
});

export default withTheme(connect(mapStateToProps, mapDispatchToProps)(IssueModal));
