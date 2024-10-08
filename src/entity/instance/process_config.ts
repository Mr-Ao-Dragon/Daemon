// Copyright (C) 2022 MCSManager <mcsmanager-dev@outlook.com>

import { $t } from "../../i18n";
import yaml from "yaml";
import properties from "properties";
import path from "path";
import fs from "fs-extra";

const CONFIG_FILE_ENCODE = "utf-8";

export interface IProcessConfig {
  fileName: string;
  path: string;
  type: string;
  info: string;
  redirect: string;
  from?: string;
  fromLink?: string;
}

export class ProcessConfig {
  constructor(public iProcessConfig: IProcessConfig) {
    iProcessConfig.path = path.normalize(iProcessConfig.path);
  }

  // Automatically parse the local file according to the type and return the configuration object
  read(): any {
    const text = fs.readFileSync(this.iProcessConfig.path, { encoding: CONFIG_FILE_ENCODE });
    if (this.iProcessConfig.type === "yml") {
      return yaml.parse(text);
    }
    if (this.iProcessConfig.type === "properties") {
      return properties.parse(text);
    }
    if (this.iProcessConfig.type === "json") {
      return JSON.parse(text);
    }
    if (this.iProcessConfig.type === "txt") {
      return text;
    }
  }

  // Automatically save to the local configuration file according to the parameter object
  write(object: Object) {
    let text = "";
    if (this.iProcessConfig.type === "yml") {
      text = yaml.stringify(object);
    }
    if (this.iProcessConfig.type === "properties") {
      text = properties.stringify(object);
      text = text.replace(/ = /gim, "=");
      if (this.iProcessConfig.fileName == "server.properties") {
        text = text.replace(/\\\\u/gim, "\\u");
      }
    }
    if (this.iProcessConfig.type === "json") {
      text = JSON.stringify(object);
    }
    if (this.iProcessConfig.type === "txt") {
      text = object.toString();
    }
    if (!text && this.iProcessConfig.type !== "txt") throw new Error($t("process_config.writEmpty"));
    fs.writeFileSync(this.iProcessConfig.path, text, { encoding: CONFIG_FILE_ENCODE });
  }

  exists() {
    return fs.existsSync(this.iProcessConfig.path);
  }
}
