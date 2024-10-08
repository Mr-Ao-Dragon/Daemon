// Copyright (C) 2022 MCSManager <mcsmanager-dev@outlook.com>

import { $t } from "../i18n";
import { Socket } from "socket.io";
import RouterContext from "../entity/ctx";
import logger from "./log";

// Define network protocols and common send/broadcast/parse functions, the client should also have this file

const STATUS_OK = 200;
const STATUS_ERR = 500;

// packet format definition
export interface IPacket {
  uuid?: string;
  status: number;
  event: string;
  data: any;
}

export interface IResponseErrorConfig {
  notPrintErr: boolean;
}

// global socket storage
const globalSocket = new Map<String, Socket>();

export class Packet implements IPacket {
  constructor(public uuid: string = null, public status = 200, public event: string = null, public data: any = null) {}
}

export function response(ctx: RouterContext, data: any) {
  const packet = new Packet(ctx.uuid, STATUS_OK, ctx.event, data);
  ctx.socket.emit(ctx.event, packet);
}

export function responseError(ctx: RouterContext, err: Error | string, config?: IResponseErrorConfig) {
  let errinfo: any = "";
  if (err) errinfo = err.toString();
  else errinfo = err;
  const packet = new Packet(ctx.uuid, STATUS_ERR, ctx.event, errinfo);
  // Ignore insufficient permission errors because restarting the daemon did not refresh the page
  if (err.toString().includes("[Unauthorized Access]")) return ctx.socket.emit(ctx.event, packet);
  if (!config?.notPrintErr)
    logger.warn($t("protocol.socketErr", { id: ctx.socket.id, address: ctx.socket.handshake.address, event: ctx.event }), err);
  ctx.socket.emit(ctx.event, packet);
}

export function msg(ctx: RouterContext, event: string, data: any) {
  const packet = new Packet(ctx.uuid, STATUS_OK, event, data);
  ctx.socket.emit(event, packet);
}

export function error(ctx: RouterContext, event: string, err: any) {
  const packet = new Packet(ctx.uuid, STATUS_ERR, event, err);
  // Ignore insufficient permission errors because restarting the daemon did not refresh the page
  if (err.toString().includes("[Unauthorized Access]")) return ctx.socket.emit(ctx.event, packet);
  logger.warn($t("protocol.socketErr", { id: ctx.socket.id, address: ctx.socket.handshake.address, event: ctx.event }), err);
  ctx.socket.emit(event, packet);
}

export function parse(text: IPacket) {
  if (typeof text == "object") {
    return new Packet(text.uuid || null, text.status, text.event, text.data);
  }
  const obj = JSON.parse(text);
  return new Packet(null, obj.status, obj.event, obj.data);
}

export function stringify(obj: any) {
  return JSON.stringify(obj);
}

export function addGlobalSocket(socket: Socket) {
  globalSocket.set(socket.id, socket);
}

export function delGlobalSocket(socket: Socket) {
  globalSocket.delete(socket.id);
}

export function socketObjects() {
  return globalSocket;
}

// global socket broadcast
export function broadcast(event: string, obj: any) {
  globalSocket.forEach((socket) => {
    msg(new RouterContext(null, socket), event, obj);
  });
}
