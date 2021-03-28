/*
 * @Projcet: MCSManager Daemon
 * @Author: Copyright(c) 2020 Suwings
 * @License: MIT
 * @Description: 应用实例和实例类实现
 */

// const childProcess = require("child_process");
const { EventEmitter } = require("events");
const iconv = require("iconv-lite");
// const { logger } = require("../service/log");
// eslint-disable-next-line no-unused-vars
const { InstanceCommand } = require("./commands/command");
const { DataStructure } = require("./structure");
// const fs = require("fs-extra");

class InstanceCommandError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class InstanceConfig extends DataStructure {
  constructor(path) {
    super(path);
    this.nickname = null;
    this.startCommand = null;
    this.stopCommand = null;
    this.cwd = null;
    this.ie = null;
    this.oe = null;
    this.createDatetime = new Date().toLocaleDateString();
    this.lastDatetime = "--";
  }

  parameters(cfg) {
    this.nickname = cfg.nickname || this.nickname || "DefaultInstance_" + new Date().getTime();
    this.startCommand = cfg.startCommand || this.startCommand || "";
    this.stopCommand = cfg.stopCommand || this.stopCommand || "^C";
    this.cwd = cfg.cwd || this.cwd || ".";
    this.ie = cfg.ie || this.ie || "GBK";
    this.oe = cfg.oe || this.oe || "GBK";
    this.save();
  }
}

class Instance extends EventEmitter {
  /**
   * @param {string} startCommand
   */
  constructor(instanceName) {
    super();

    //Basic information
    this.instanceStatus = Instance.STATUS_STOP;
    this.instanceName = instanceName;

    // Action lock
    this.lock = false;

    // Config init
    this.config = new InstanceConfig(instanceName);
    this.config.load();

    this.process = null;
    this.startCount = 0;
  }

  parameters(cfg) {
    this.config.parameters(cfg);
  }

  setLock(bool) {
    this.lock = bool;
  }

  /**
   * 对本实例执行对应的命令
   * @param {InstanceCommand} command
   * @return {void}
   */
  execCommand(command) {
    if (this.lock)
      throw new InstanceCommandError(`This ${command.info} operation cannot be completed because the command executes a deadlock.`);
    if (this.status() == Instance.STATUS_BUSY)
      throw new InstanceCommandError(`The status of ${this.instanceName} instance is busy and cannot do anything.`);
    command.exec(this);
  }

  /**
   * 对本实例执行对应的命令 别名
   * @param {InstanceCommand} command
   * @return {void}
   */
  exec(command) {
    this.execCommand(command);
  }

  status(v) {
    if (v) this.instanceStatus = v;
    return this.instanceStatus;
  }

  /**
   * 实例已启动后必须执行的函数
   * @param {NodeJS.Process} process
   */
  started(process) {
    this.config.lastDatetime = this.fullTime();
    // Process event.
    process.stdout.on("data", (text) => this.emit("data", iconv.decode(text, this.config.ie)));
    process.stderr.on("data", (text) => this.emit("data", iconv.decode(text, this.config.oe)));
    process.on("exit", (code) => this.stoped(code));
    this.process = process;
    this.instanceStatus = Instance.STATUS_RUNNING;
    this.emit("open", this);
    this.config.save();
  }

  /**
   * 实例已关闭后必须执行的函数
   * @param {Number} code
   */
  stoped(code = 0) {
    this.releaseResources();
    this.instanceStatus = Instance.STATUS_STOP;
    this.emit("exit", code);
    if (this.config) this.config.save();
  }

  releaseResources() {
    if (this.process && this.process.stdout && this.process.stderr) {
      // 移除所有动态新增的事件监听者
      for (const eventName of this.process.stdout.eventNames()) this.process.stdout.removeAllListeners(eventName);
      for (const eventName of this.process.stderr.eventNames()) this.process.stderr.removeAllListeners(eventName);
      for (const eventName of this.process.eventNames()) this.process.removeAllListeners(eventName);
      this.process.stdout.destroy();
      this.process.stderr.destroy();
    }
    this.process = null;
  }

  destroy() {
    try {
      if (this.process && this.process.pid) {
        this.process.kill("SIGKILL");
      }
      this.stoped(-999);
    } finally {
      this.config.del();
      this.config = null;
    }
  }

  fullTime() {
    const date = new Date();
    return date.toLocaleDateString() + " " + date.getHours() + ":" + date.getMinutes();
  }

}

// 实例类静态变量
Instance.STATUS_BUSY = -1;
Instance.STATUS_STOP = 0;
Instance.STATUS_STOPPING = 1;
Instance.STATUS_STARTING = 2;
Instance.STATUS_RUNNING = 3;

module.exports = {
  Instance
};
