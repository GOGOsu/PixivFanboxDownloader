// api 类
// 不依赖其他模块，可独立使用
import {
  Post,
  PostList,
  CreatorData,
  SupportPostList,
  TagPostList,
} from './CrawlResult.d'

import { originFetch } from './utils/OriginFetch'

class API {
  // 组装 url 的查询参数。当该参数有值时，将其添加到 url 里
  static assembleURL(
    baseURL: string,
    args: { [key: string]: string | number }
  ) {
    const temp = new URL(baseURL)
    for (const [key, value] of Object.entries(args)) {
      value && temp.searchParams.append(key, value.toString())
    }
    return temp.toString()
  }

  // 通用的请求流程
  // 发送 get 请求，返回 json 数据，抛出异常
  static request<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      originFetch(url, {
        method: 'get',
        credentials: 'include',
      })
        .then((response) => {
          if (response.ok) {
            return JSON.parse(response.body) as T
          } else {
            // 第一种异常，请求成功但状态不对
            reject({
              status: response.status,
              statusText: response.status.toString(),
            })
          }
        })
        .then((data) => {
          if (data != undefined) resolve(data)
          else reject({ status: -114514, statusText: 'error' })
        })
        .catch((error) => {
          // 第二种异常，请求失败
          reject(error)
        })
    })
  }

  static getCreatorId(url: string) {
    const split = url.split('/')
    // 首先获取以 @ 开头的用户名
    for (const str of split) {
      if (str.startsWith('@')) {
        return str.split('@')[1]
      }
    }

    // 获取自定义的用户名
    for (const str of split) {
      // hostname
      if (str.endsWith('.fanbox.cc')) {
        return str.split('.')[0]
      }
    }

    throw new Error('GetCreatorId error!')
  }

  // 用 creatorId（用户名） 获取 userId
  static async getUserId(creatorId: string) {
    const baseURL = `https://api.fanbox.cc/creator.get?creatorId=${creatorId}`
    const res = (await this.request(baseURL)) as CreatorData
    return res.body.user.userId
  }

  /**获取赞助的用户的文章列表 */
  static async getPostListSupporting(
    limit = 10,
    maxPublishedDatetime = '',
    maxId = ''
  ): Promise<SupportPostList> {
    const baseURL = 'https://api.fanbox.cc/post.listSupporting'
    const url = this.assembleURL(baseURL, {
      limit,
      maxPublishedDatetime,
      maxId,
    })
    return this.request(url)
  }

  static async getPostListByUser(
    creatorId: string,
    limit = 10,
    maxPublishedDatetime = '',
    maxId = ''
  ): Promise<PostList> {
    const baseURL = `https://api.fanbox.cc/post.listCreator?creatorId=${creatorId}`
    const url = this.assembleURL(baseURL, {
      limit,
      maxPublishedDatetime,
      maxId,
      withPinned: 'true',
    })
    return this.request(url)
  }

  static async getTagPostListByUser(
    userId: string,
    tag: string
  ): Promise<TagPostList> {
    const url = `https://api.fanbox.cc/post.listTagged?tag=${tag}&userId=${userId}`
    return this.request(url)
  }

  static async getPost(postId: string): Promise<Post> {
    const url = `https://api.fanbox.cc/post.info?postId=${postId}`
    return this.request(url)
  }
}

export { API }
