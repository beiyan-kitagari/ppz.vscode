import Collection from '@ppzp/bd/collection'

class ConnectionCollection extends Collection {
  constructor() {
    super('connection')
  }

  async upsert(record) {
    // PPZ_ADAPTER
    let { useUrl, url, client } = record
    // 为 MySQL 添加“多行语句”参数
    if(client == 'mysql' && useUrl && url) {
      url = new URL(url)
      url.searchParams.set('multipleStatements', true)
      record.url = url.href
    }
    if(record.port)
      record.port = parseInt(record.port) || record.port
    return super.upsert(record)
  }
}

export default new ConnectionCollection()