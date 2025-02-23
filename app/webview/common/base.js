import Path from 'path'
import fs from 'fs'
import vscode from 'vscode'
import { get as getContext } from '@ppzp/context'

import untitledFile from '../../../lib/vscode-utils/untitled-file'
import noty from '../../../lib/vscode-utils/noty'
import prompt from '../../../lib/vscode-utils/prompt/webview/server'
import WebviewServer from '../../../lib/vscode-utils/request/server'
import selectFile from '../../../lib/vscode-utils/file-selector/server'

export default
class Webview {
  constructor({
    connection,
    filename,
    category = 'ppz',
    title = 'ppz',
    initData,
    webviewServerHandlers
  }) {
    this.connection = connection
    console.debug('webview constructing', filename)
    // html 文件路径
    const path = this.localPath('webview/pages/' + filename + '/index.html')
    console.debug(path)
    // 读取 html 文件
    fs.readFile(path, (err, data) => {
      if(err) {
        const msg = 'webview 创建失败：读取 html 文件时发生异常'
        console.error(msg, err)
        throw Error(msg)
      }
      // 向空网页填充内容
      this.panel.webview.html = this.tmpl({
        filename,
        title,
        body: data.toString()
      })
    })
    this.initData = initData
    // 创建 webview
    this.panel = vscode.window.createWebviewPanel(
      category,
      title,
      vscode.ViewColumn.One,
      {
        localResourceRoots: [vscode.Uri.file(getContext().extensionPath)],
        enableScripts: true
      }
    )
    this.panel.iconPath = {
      light: this.uri('logo.svg'),
      dark: this.uri('logo-white.svg')
    }
    // 处理来自网页的请求
    new WebviewServer(this.panel.webview, getContext().subscriptions, {
      noty: ({ type, msg, btns }) => {
        const result = noty[type](msg, btns)
        if(btns.length)
          return result
      },
      prompt,
      selectFile,
      openFile({ content, language }) {
        untitledFile(content, language)
      },
      dispose: () => { // 销毁 webview
        this.dispose()
      },
      saveState: state => { // 保存 state
        this.state = state
        console.debug('state saved')
      },
      getState: () => this.state,
      ...webviewServerHandlers
    })

    console.debug('webview constructed')
  }

  dispose() {
    this.panel.dispose()
  }
  webviewUri(path) {
    return this.panel.webview.asWebviewUri(vscode.Uri.file(
      Path.join(getContext().extensionPath, 'assets/webview', path)
    ))
  }

  localPath(path) {
    return Path.join(getContext().extensionPath, 'assets', path)
  }

  uri(path) {
    return vscode.Uri.file(this.localPath(path))
  }

  sendMessage(type, data) {
    const msg = { type, data }
    console.debug('sending message to webview', { type })
    this.panel.webview.postMessage(msg)
  }

  handleErr(err) {
    console.error(err)
    noty.fatal('未知错误 ' + err.toString())
  }

  tmpl({
    filename,
    title,
    body
  }) {
    if(fs.existsSync(this.localPath(`webview/pages/${filename}/index.css`)))
      var css = this.webviewUri(`pages/${filename}/index.css`)
    if(fs.existsSync(this.localPath(`webview/pages/${filename}/index.js`)))
      var js = this.webviewUri(`pages/${filename}/index.js`)
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <link rel="stylesheet" href="${this.webviewUri('style/index.css')}"></link>
          ${css ? `<link rel="stylesheet" href="${css}"></link>` : ''}
        </head>
        <body>
          <script>
            window.VSCODE = acquireVsCodeApi()
            window.PPZ = {
              initData: ${JSON.stringify(this.initData)},
            }
          </script>
          ${body}
          ${js ? `<script type="module" src="${js}"></script>` : ''}
        </body>
      </html>
    `
  }
}