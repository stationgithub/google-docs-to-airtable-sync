function onOpen() {
  DocAirtableSync.createMenu();
}

function handleManualSync() {
  DocAirtableSync.syncManual();
  DocAirtableSync.ensureTriggerExists("trigger_AutoSync", 10);
}

function handleStopSync() {
  DocAirtableSync.removeTrigger("trigger_AutoSync");
}

function trigger_AutoSync() {
  DocAirtableSync.syncSilent();
}
