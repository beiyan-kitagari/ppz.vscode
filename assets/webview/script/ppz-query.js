import './iconfont.js'

/** @returns {HTMLElement} */
export default function $(selector) {
  if(typeof selector == 'string')
    return document.querySelector(selector)
  return selector
}

import { El, Span, Div, Icon, Button } from './el/index.js'
import Form from './el/form/index.js'
import { Table, THead, TBody } from './el/table/index.js'

$.El = El
$.Div = Div
$.Span = Span
$.Icon = Icon
$.Button = Button

$.Form = Form

$.Table = Table
$.THead = THead
$.TBody = TBody

$.clone = function(data) {
  const result = {}
  for(let k in data)
    result[k] = data[k]
  return result
}

// 可优化
$.msg = function(messageType, handler) {
  window.addEventListener('message', function({ data: { type, data }}) {
    if(messageType == type) {
      console.debug('收到消息', type, data)
      handler(data)
    }
  })
}

$.isNil = function(target) {
  if(target == null || target == undefined)
    return true
  return false
}

$.getOldSetNow = new function() {
  let old = undefined
  return function(now) {
    const _old = old
    old = now
    return _old
  }
}