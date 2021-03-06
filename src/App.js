import React, { Component } from 'react';
import './App.css';
import Layout from './Layout'
import { Route } from 'react-router-dom'
import Routes from './routes'
import { connect } from 'react-redux'
import { SET_FOLIDAY_TOKEN, setFolidayToken, setUserInfo, setNotLayout, setIsInsideApp } from './actions';
import { Prius } from 'foliday-bridge'
import { getQueryVariable } from './utils/util'
import { account_current } from './pages/api/account'
// import { Toast } from 'antd-mobile';
import hostConfig from '@/hostConfig'
window.Prius = Prius

@connect((state, props) => Object.assign({}, props, state), {
  setFolidayToken, setUserInfo, setNotLayout, setIsInsideApp
})
class App extends Component {
  constructor(...args) {
    super(...args)
    this.props.setIsInsideApp(Prius.isInsideApp)
  }


  // 获取用户信息
  async fnAccount_current() {
    try {
      let userInfo = await account_current()
      // 判断isStaff 是不是员工
      // if (userInfo.isStaff !== 1) {
      //   Toast.fail('您不是复星员工！', 2);
      //   // return
      // }
      this.props.setUserInfo(userInfo)
    }
    catch (e) {
      //
    }
  }

  fnNotLayout() {
    const notLayout = Routes.find(item => {
      return item.path === this.props.location.pathname && item.notLayout === true
    })
    if (notLayout) {
      this.props.setNotLayout(true)
    }
    else {
      this.props.setNotLayout(false)
    }
  }

  // 检测是否登录
  async fnCheckLogin() {
    // 如果没有用户信息在redux中
    if (!Object.keys(this.props.user.userInfo).length) {
      let Token = getQueryVariable('token')
      // 如果在app里
      if (window.Prius.isInsideApp) {
        let _this = this
        const fnLoginBoth = (data) => {
          // 有token
          let { token } = data
          Token = token
          _this.props.setFolidayToken(Token)
          _this.fnAccount_current()

        }

        // 没登录取登录然后取token
        Prius.addCallback({
          callId: "login_in",
          listener: function (data) {
            if (data.code === "0") {
              fnLoginBoth(data)
              window.location.reload()
            }
          }
        });
        // 如果app登录了直接取token取拿用户信息
        window.Prius.appEventCallback({
          callId: "LOGIN",
          data: {},
          listener: async function (data) {
            if (data.token) {
              fnLoginBoth(data)
            }
          }
        })
      }
      // 不在app里
      else {
        let folidayToken = this.props.user.folidayToken || localStorage.getItem(SET_FOLIDAY_TOKEN)
        // redux上没有folidayToken 或者 storeage里没有 folidayToken
        // 如果扫码跳转到宣传页不用登陆
        if (this.props.location.pathname === "/propaganda") {
          return
        }
        if (!folidayToken) {
          // query上有token
          if (Token) {
            this.props.setFolidayToken(Token)
            await this.fnAccount_current()
            return
          }
          // 啥都没有就滚去(测试)登录页面
          window.location = `${hostConfig.mBase}logins?redirect=${window.location.href}`
        }
        // redux有folidayToken 或者 storeage有folidayToken
        else {
          await this.fnAccount_current()
          // 清除query上的token
          Token && this.props.history.replace(this.props.location.pathname)
        }
      }
    }
  }

  componentDidMount() {
    // window.onerror = function (message, source, lineno, colno, error) {
    //   alert(error)
    // }
    this.fnCheckLogin();
    this.fnNotLayout();
  }

  componentDidUpdate() {
    // console.log('componentDidUpdate')
    this.fnNotLayout();
  }

  render() {
    if (Object.keys(this.props.user.userInfo).length || this.props.location.pathname === "/propaganda") {
      return (
        <div className="App">
          {
            Routes.map((item, index) => {
              if (item.notLayout) {
                return (
                  <Route key={index} path={item.path} exact component={item.component} />
                )
              } else {
                return null
              }
            })
          }
          <Layout />
        </div>
      )
    } else {
      return (
        <div></div>
      )
    }
  }
}

export default App
