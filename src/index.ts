import fs from 'node:fs'
import { env } from 'node:process'
import dotenv from 'dotenv'
import type { z } from 'zod'
import { Log } from '@lsby/ts-log'

export class Env<环境变量描述 extends z.AnyZodObject> {
  private 环境变量: z.infer<环境变量描述> | null = null
  private log: Log | null = null

  constructor(
    private opt:
      | {
          模式: '直接指定文件路径'
          环境文件路径: string
          环境描述: 环境变量描述
          log名称?: string | undefined
        }
      | {
          模式: '通过环境变量指定文件路径'
          环境变量名称: string
          环境描述: 环境变量描述
          log名称?: string | undefined
        },
  ) {}

  private async 获得log(): Promise<Log> {
    var log名称 = this.opt.log名称 || '@lsby:ts-env'

    if (this.log != null) return this.log
    this.log = new Log(log名称)
    return this.log
  }

  private async 初始化(): Promise<void> {
    var log = await this.获得log()

    var 文件路径: string | null = null
    if (this.opt.模式 == '通过环境变量指定文件路径') {
      await log.debug('查找环境变量: %o', this.opt.环境变量名称)
      var p = process.env[this.opt.环境变量名称]
      if (p == null) {
        throw new Error(`环境变量 ${this.opt.环境变量名称} 不存在`)
      }
      文件路径 = p
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (文件路径 == null) {
      throw new Error('无法读取环境文件路径')
    }

    await log.debug('查找环境变量文件: %o', 文件路径)
    if (fs.existsSync(文件路径)) {
      await log.debug('已找到环境变量文件')
      await log.debug('将使用该文件定义的环境变量, 但不会覆盖终端环境变量')
      dotenv.config({ path: 文件路径 })
      return
    } else {
      await log.debug(`没有找到环境变量文件: %o`)
      throw new Error(`没有找到环境变量文件: ${文件路径}`)
    }
  }

  async 获得环境变量(): Promise<z.infer<环境变量描述>> {
    var log = await this.获得log()

    if (this.环境变量 != null) return this.环境变量

    await this.初始化()
    var parseResult = this.opt.环境描述.safeParse(env)
    if (parseResult.success == false) {
      await log.err('环境变量验证失败: %o', parseResult.error)
      throw new Error('环境变量验证失败')
    }
    this.环境变量 = parseResult.data

    return this.环境变量
  }
}
