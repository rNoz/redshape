import request, { notify } from './helper';

export const TIME_SUBMIT = 'TIME_SUBMIT';
export const TIME_UPDATE = 'TIME_UPDATE';
export const TIME_GET_ALL = 'TIME_GET_ALL';

const submit = (issueId, date, hours, activityId, comment) => (dispatch, getState) => {
  const { user = {} } = getState();
  const { redmineEndpoint, api_key } = user;

  dispatch(notify.start(TIME_SUBMIT));

  return request({
    url: `${redmineEndpoint}/time_entries.json`,
    method: 'POST',
    token: api_key,
    data: {
      time_entry: {
        issue_id: issueId,
        spent_on: date.toISOString(),
        hours,
        activity_id: activityId,
        comments: comment
      }
    }
  })
    .then(({ data }) => dispatch(notify.ok(TIME_SUBMIT, data)))
    .catch((error) => {
      console.error(`Error when submitting the time to the issue with id ${issueId}`, error);
      dispatch(notify.nok(TIME_SUBMIT, error));
    });
};

const update = (entryId, issueId, date, hours, activityId, comment) => (dispatch, getState) => {
  const { user = {} } = getState();
  const { redmineEndpoint, api_key } = user;

  dispatch(notify.start(TIME_UPDATE));

  return request({
    url: `${redmineEndpoint}/time_entries/${entryId}.json`,
    method: 'PUT',
    token: api_key,
    data: {
      time_entry: {
        issue_id: issueId,
        spent_on: date.toISOString(),
        hours,
        activity_id: activityId,
        comments: comment
      }
    },
  }).then(({ data }) => dispatch(notify.ok(TIME_UPDATE, data)))
    .catch((error) => {
      console.error(`Error when submitting the time to the issue with id ${issueId}`, error);
      dispatch(notify.nok(TIME_UPDATE, error));
    });
};

const getAll = (offset, limit, userId, projectId, issueId) => (dispatch, getState) => {
  const { user = {} } = getState();
  const { redmineEndpoint, api_key } = user;
  let url = `${redmineEndpoint}/time_entries.json?`;
  const params = {
    offset,
    limit,
    user_id: userId,
    project_id: projectId,
    issue_id: issueId
  };

  for (const [key, value] of Object.entries(params)) { // eslint-disable-line
    if (value) {
      url += `&${key}=${value}`;
    }
  }

  dispatch(notify.start(TIME_GET_ALL));

  return request({
    url,
    token: api_key,
  }).then(({ data }) => dispatch(notify.ok(TIME_GET_ALL, data)))
    .catch((error) => {
      console.error('Error when trying to get he list of time entries', error);
      dispatch(notify.nok(TIME_GET_ALL, error));
    });
};

export default {
  submit,
  update,
  getAll
};