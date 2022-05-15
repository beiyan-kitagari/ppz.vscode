import $ from '../../script/ppz-query.js'
import Page from '../../script/page.js'
import Pagination, { config } from '../../cmps/pagination.js'
import PNE from './pne-wrapper.js'

// 有些表，没主键，即使理论上可以精准删除、编辑，但复杂度攀升，不做考虑
new Page({
  async init() {
    const page = this
    if(!this.state) {
      // 恢复 state 仅考虑恢复原来的页面，如果页面上的真实数据变了，不应在恢复 state 时处理
      // 因为页面在一直运行的过程中，真实数据也在变化
      const selectParams = {
        pagination: {
          index: 1,
          size: config.size,
          count: 0
        }
      }
      const { fields, records, count } = await $.api.getData(selectParams)
      selectParams.fields = fields.map(f => f.name)
      selectParams.pagination.count = count
      
      this.state = {
        __fields: fields,
        __records: records,
        selectParams,
        table: null
      }
      this.saveState()
    } else
      console.debug('initial state', page.state)
    const state = page.state
    const setFields = fields => {
      state.__fields = fields
      state.selectParams.fields = fields.map(f => f.name)
    }
    const setRecords = (records, count) => {
      state.__records = records
      state.selectParams.pagination.count = count
    }

    const header = new function() {
      const pagination = new function() {
        const { count, index, size } = page.state.selectParams.pagination
        const p = Pagination({
          count, index, size,
          onChange({ index, size }) {
            page.state.selectParams.pagination = { index, size }
            // page.state.selectParams.pagination.index = index
            // page.state.selectParams.pagination.size = size
            // 上面两行代码，看似安全（好像在保护开发者），实则是把 bug 藏得更深了
            // count 在返回后设置，state 在返回后保存
            refreshData()
          }
        })
        const isDisabledBtn = btn => btn.tagName == 'BUTTON' && btn.disabled
        p.$el.addEventListener('click', function(evt) {
          const name = evt.target.tagName
          if(!['BUTTON', 'svg', 'use'].includes(name)) return // 不是按钮的不处理
          if(isDisabledBtn(evt.target) // 是按钮但 disabled 的也不处理
            || isDisabledBtn(evt.target.parentElement)
            || isDisabledBtn(evt.target.parentElement.parentElement)) return
          
          if(table.isEditing()) {
            $.noty.warn('请先保存修改内容（或撤销）')
            evt.stopPropagation()
          }
        }, true)
        return p
      }

      this.$el = $.El('header', '', [
        $.El('nav', '', [
          $.Span(PPZ.initData.connection),
          $.Icon('arrow-right'),
          $.Span(PPZ.initData.database),
          $.Icon('arrow-right'),
          $.Span(PPZ.initData.table)
        ]),
        $.Div('operations', [
          $.Div('btns', [
            Button('刷新', 'light', function() {
              if(table.isEditing()) {
                $.noty.warn('请先保存修改内容（或撤销）')
                return
              }
              refreshData()
            }),
            Button('字段选择', 'filter', function() {
            }),
            Button('新增', 'add', function() {
            }),
            Button('拷贝当前记录', 'copy', function() {
            }),
            Button('保存', 'save', async function() {
              const editing = table.getEditing()
              if(editing == null || editing.length == 0) {
                $.noty.warn('没有待保存的数据')
                return
              }
              const success = await $.api.update(editing)
              if(success)
                refreshData()
            }),
            Button('撤销全部', 'undo', function() {
              if(!table.isEditing()) {
                $.noty.warn('未检测到修改内容')
                return
              }
              $.prompt.warn('是否撤销全部修改', '', {
                确定() {
                  table.reset()
                }
              })
            }),
            Button('删除当前记录', 'delete', function() {
              if(!table.editable()) {
                $.noty.warn('当前表格不可编辑')
                return
              }
              if(table.isEditing()) {
                $.noty.warn('请先保存修改内容（或撤销）')
                return
              }
              const _state = state.table.focus
              if(!_state) {
                $.noty.warn('请先点击想要删除的记录')
                return
              }
              /* bug 预警 */
              let warnMsg = []
              for(const pk of table.pks())
                if(_state.pkValue[pk] === undefined) {
                  $.noty.bug('state 不正常，缺少主键的值')
                  return
                } else
                  warnMsg.push(pk + ' 为 ' + _state.pkValue[pk])
              if(warnMsg.length == 0) {
                $.noty.bug('逻辑不正常，正在删除没有主键的表记录')
                return
              }
              warnMsg = warnMsg.join(' 且 ')
              
              $.prompt.warn('确定删除？', '您正在删除 ' + warnMsg + ' 的记录，删除后不可恢复', {
                确定() {
                  console.log('deleting', _state.pkValue)
                }
              })
            }),
            Button('打开 sql 文件', 'sql', function() {
            })
          ]),
          pagination.$el
        ])
      ])
      
      function Button(title, icon, handler) {
        const el = $.Button('', [$.Icon(icon)], handler)
        el.title = title
        return el
      }
      
      async function refreshData() {
        const { fields, records, count } = await $.api.getData(page.state.selectParams)
        setFields(fields)
        setRecords(records, count)
        // page.saveState() // 交给 updateData 做
        table.updateData(fields, records)
      }
    }

    const table = PNE(
      state.__fields,
      state.__records,
      state.table, // state
      tableState => { // saveState
        if(tableState)
          state.table = tableState
        page.saveState()
      }
    )

    $('body').append(
      header.$el,
      table.$el
    )
  }
})
