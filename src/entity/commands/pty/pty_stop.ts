// Copyright (C) 2022 MCSManager <mcsmanager-dev@outlook.com>

import { $t } from "../../../i18n";
import Instance from "../../instance/instance";
import InstanceCommand from "../base/command";
import SendCommand from "../cmd";

export default class PtyStopCommand extends InstanceCommand {
  constructor() {
    super("PtyStopCommand");
  }

  async exec(instance: Instance) {
    let stopCommand = instance.config.stopCommand;
    if (stopCommand.toLocaleLowerCase() == "^c") stopCommand = "\x03";

    if (instance.status() === Instance.STATUS_STOP || !instance.process) return instance.failure(new Error($t("pty_stop.notRunning")));
    instance.status(Instance.STATUS_STOPPING);

    await instance.exec(new SendCommand(stopCommand));

    instance.println("INFO", $t("pty_stop.execCmd", { stopCommand: stopCommand }));

    // If the instance is still in the stopped state after 10 minutes, restore the state
    const cacheStartCount = instance.startCount;
    setTimeout(() => {
      if (instance.status() === Instance.STATUS_STOPPING && instance.startCount === cacheStartCount) {
        instance.println("ERROR", $t("pty_stop.stopErr"));
        instance.status(Instance.STATUS_RUNNING);
      }
    }, 1000 * 60 * 10);

    return instance;
  }
}
