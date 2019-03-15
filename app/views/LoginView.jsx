import React, { Component } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Formik } from 'formik';
import Joi from 'joi';
import { withRouter } from 'react-router-dom';
import GithubCircleIcon from 'mdi-react/GithubCircleIcon';

import actions from '../actions';

import { Input, Label } from '../components/Input';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import Link from '../components/Link';
import Copyrights from '../components/Copyrights';

const Container = styled.div`
  display: grid;
  grid-template-rows: repeat(4, 25vh);
  grid-template-columns: repeat(6, minmax(100px, 1fr));
  align-items: center;
  justify-items: center;
`;

const LoginForm = styled.form`
  padding: 40px;
  grid-column: 2 / 6;
  grid-row: 2 / 4;
  min-width: 300px;
`;

const Headline = styled.h1`
  text-align: center;
  font-size: 40px;
  color: #FF7079;
`;

const GHLinkContainer = styled.div`
  grid-column: 6;
  justify-self: end;
  align-self: start;
  margin: 20px 20px 0px 0px;
`;

const CopyrightsContainer = styled.div`
  grid-row: 4;
  grid-column: 2 / 6;
  align-self: end;
  margin-bottom: 20px;
`;

class LoginView extends Component {  
  componentWillMount() {
    const { user } = this.props;
    if (user.id && user.api_key) {
      this.props.history.push('/app');
    }
  }

  validate = ({ username, password, redmineEndpoint }) => {
    const errors = {
      username: Joi.validate(username, Joi.string().required()),
      password: Joi.validate(password, Joi.string().required()),
      redmineEndpoint: Joi.validate(redmineEndpoint, Joi.string().uri().required())
    };
    const results = {};
    for (const [prop, validation] of Object.entries(errors)) {
      if (validation.error) {
        results[prop] = validation.error.message.replace('value', prop);
      }
    }
    return results;
  };

  onSubmit = (values, { setSubmitting }) => {
    const { dispatch } = this.props;
    dispatch(actions.user.checkLogin(values))
    .then(() => {
      const { loginError, user } = this.props;
      if (!loginError && user.id) {
        this.props.history.push('/app');
      }
      setSubmitting(false);
    });
  }

  render() {
    const { loginError } = this.props; 
    return (
      <Container>
        <GHLinkContainer>
          <Link type="external" href="https://github.com/Spring3/redtime">
            <GithubCircleIcon color="#FF7079" size="30"/>
          </Link>
        </GHLinkContainer>
        <Formik
          initialValues={{ username: '', password: '', redmineEndpoint: '' }}
          validate={this.validate}
          onSubmit={this.onSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting
          }) => (
            <LoginForm onSubmit={handleSubmit}>
              <Headline>Redtime</Headline>
              <Label
                label="Login"
                htmlFor="username"
              >
                <Input
                  type="text"
                  name="username"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.username}
                />
              </Label>
              <ErrorMessage show={errors.username && touched.username}>
                {errors.username}
              </ErrorMessage>
              <Label
                label="Password"
                htmlFor="password"
              >
                <Input
                  type="password"
                  name="password"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.password}
                />
              </Label>
              <ErrorMessage show={errors.password && touched.password}>
                {errors.password}
              </ErrorMessage>
              <Label
                label="Remdine Host"
                htmlFor="redmineEndpoint"
              >
                <Input
                  name="redmineEndpoint"
                  placeholder="https://redmine.example.com"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.redmineEndpoint}
                />
              </Label>
              <ErrorMessage show={errors.redmineEndpoint && touched.redmineEndpoint}>
                {errors.redmineEndpoint}
              </ErrorMessage>
              <Button
                type="submit"
                disabled={isSubmitting}
                block={true}
              >
                Submit
              </Button>
              <ErrorMessage show={!!loginError}>
                {loginError && loginError.message}
              </ErrorMessage>
            </LoginForm>
          )}
        </Formik>
        <CopyrightsContainer>
          <Copyrights />
        </CopyrightsContainer>
      </Container>
    );
  }
}

LoginView.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    firstname: PropTypes.string.isRequired,
    lastname: PropTypes.string.isRequired,
    api_key: PropTypes.string.isRequired,
    redmineEndpoint: PropTypes.string.isRequired
  }),
  loginError: PropTypes.instanceOf(Error)
}

const mapStateToProps = state => ({
  user: state.user,
  loginError: state.user.loginError
});

const mapDispatchToProps = dispatch => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(LoginView));