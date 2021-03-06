import React from 'react';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import { ThemeProvider } from 'styled-components';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import MarkdownEditor, { MarkdownText } from '../MarkdownEditor';
import utils from '../../../common/utils';
import theme from '../../theme';

const mockStore = configureStore([thunk]);

describe('MarkdownEditor component', () => {
  it('should match the snapshot', () => {
    const state = {
      settings: {
        uiStyle: 'enhanced'
      }
    };
    const store = mockStore(state);
    const tree = renderer.create(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownEditor />
        </ThemeProvider>
      </Provider>
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should display a menu and a text area', () => {
    const onChange = jest.fn();
    const state = {
      settings: {
        uiStyle: 'enhanced'
      }
    };
    const store = mockStore(state);
    const wrapper = mount(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownEditor onChange={onChange} />
        </ThemeProvider>
      </Provider>
    );
    expect(wrapper.find('ul')).toBeTruthy();
    expect(wrapper.find('textarea')).toBeTruthy();

    wrapper.find('textarea').simulate('change', { target: { value: 'test' }, persist: () => {} });
    wrapper.update();
    expect(wrapper.find('textarea').prop('value')).toBe('test');
    expect(wrapper.find('MarkdownEditor').state('value')).toBe('test');
    expect(onChange).toHaveBeenCalled();
    onChange.mockReset();

    const options = wrapper.find('li');
    options.forEach((option) => {
      if (option.exists('.tooltip')) {
        option.simulate('click');
      }
    });
    wrapper.update();
    // enzyme does not update the caret position, so the markdown items during tests are prepended, not appended
    // in reality, the value will be 'test******__~~~~\r\n```\r\n\r\n```\r\n# ## ### - 1. > [](url)![](image-url)'
    expect(wrapper.find('textarea').prop('value')).toBe('![](image-url)[](url)> 1. - ### ## # \r\n```\r\n\r\n```\r\n~~~~__******test');
  });

  it('should display the preview when such option was clicked', () => {
    const state = {
      settings: {
        uiStyle: 'enhanced',
      }
    };
    const store = mockStore(state);
    const wrapper = mount(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownEditor initialValue="Lorem ipsum dolor" />
        </ThemeProvider>
      </Provider>
    );
    expect(wrapper.exists('button'));
    expect(wrapper.find('MarkdownEditor').state('showPreview')).toBe(false);
    wrapper.find('GhostButton').simulate('click');
    wrapper.update();
    expect(wrapper.find('MarkdownEditor').state('showPreview')).toBe(true);

    expect(wrapper.exists('textarea')).toBe(false);
    expect(wrapper.exists('MarkdownText')).toBe(true);
    expect(wrapper.find('MarkdownText').prop('markdownText')).toBe(wrapper.find('MarkdownEditor').state('value'));
  });

  it('should submit and reset the state after it when it success', () => {
    const onSubmit = jest.fn().mockImplementation(() => Promise.resolve());
    const xssSpy = jest.spyOn(utils, 'xssFilter');
    const state = {
      settings: {
        uiStyle: 'enhanced',
      }
    };
    const store = mockStore(state);
    const wrapper = mount(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownEditor initialValue="Lorem ipsum dolor" onSubmit={onSubmit} />
        </ThemeProvider>
      </Provider>
    );

    const KEY_ENTER = 13;
    wrapper.find('textarea').simulate('keyDown', { keyCode: KEY_ENTER, metaKey: true, ctrlKey: true });
    wrapper.update();
    expect(onSubmit).toHaveBeenCalled();
    expect(xssSpy).toHaveBeenCalled();
    setTimeout(() => {
      expect(wrapper.find('MarkdownEditor').state('value')).toBe('');
    }, 50);
  });

  it('should submit and not reset the state after it when it fails', () => {
    const onSubmit = jest.fn().mockImplementation(() => Promise.reject(new Error()));
    const xssSpy = jest.spyOn(utils, 'xssFilter');
    const state = {
      settings: {
        uiStyle: 'enhanced',
      }
    };
    const store = mockStore(state);
    const wrapper = mount(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownEditor initialValue="Lorem ipsum dolor" onSubmit={onSubmit} />
        </ThemeProvider>
      </Provider>
    );

    const KEY_ENTER = 13;
    wrapper.find('textarea').simulate('keyDown', { keyCode: KEY_ENTER, metaKey: true, ctrlKey: true });
    wrapper.update();
    expect(onSubmit).toHaveBeenCalled();
    expect(xssSpy).toHaveBeenCalled();
    setTimeout(() => {
      expect(wrapper.find('MarkdownEditor').state('value')).toBe('Lorem ipsum dolor');
    }, 50);
  });

  it('should add a newline on macos if ctrl+enter was pressed', () => {
    const state = {
      settings: {
        uiStyle: 'enhanced',
      }
    };
    const store = mockStore(state);
    const wrapper = mount(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownEditor initialValue="Lorem ipsum dolor" />
        </ThemeProvider>
      </Provider>
    );

    const KEY_ENTER = 13;
    wrapper.find('textarea').simulate('keyDown', { keyCode: KEY_ENTER, ctrlKey: true });
    wrapper.update();
    expect(wrapper.find('MarkdownEditor').state('value')).toBe('\r\nLorem ipsum dolor');
  });
});

describe('MarkdownText component', () => {
  it('should match the snapshot', () => {
    const state = {
      settings: {
        uiStyle: 'enhanced',
      }
    };
    const store = mockStore(state);
    const tree = renderer.create(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownText markdownText="Lorem ipsum" />
        </ThemeProvider>
      </Provider>
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should apply xss filter to the output', () => {
    const state = {
      settings: {
        uiStyle: 'enhanced',
      }
    };
    const store = mockStore(state);
    const xssSpy = jest.spyOn(utils, 'xssFilter');
    const wrapper = mount(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MarkdownText markdownText="Hello <a href='javascript::alert(\'Hello\')' />" />
        </ThemeProvider>
      </Provider>
    );
    expect(wrapper.exists('iframe'));
    expect(xssSpy).toHaveBeenCalled();
    expect(wrapper.find('iframe').prop('srcDoc').indexOf('javascript::alert(\'Hello\')')).toBe(-1); // eslint-disable-line
  });
});
