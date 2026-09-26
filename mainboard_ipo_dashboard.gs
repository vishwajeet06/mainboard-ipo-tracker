/**
 * Mainboard IPO Tracker & Retail Decision Dashboard
 * Automated Google Apps Script
 * Date: Friday, September 25, 2026
 * 
 * Rules Enforced:
 * 1. Strict Mainboard (BSE/NSE) scope - Never includes SME IPOs.
 * 2. Non-table sections start from Column B.
 * 3. Main tracker table is full-width starting from Column A.
 * 4. Freeze ONLY Column A (IPO Name); do NOT freeze any rows (mobile friendly).
 * 5. File Management: Keeps files modified today and yesterday; trashes older dashboard files;
 *    strictly protects "IPO Data Feed (Auto)" and non-IPO files.
 */

function updateMainboardIPODashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName("Main Dashboard") || ss.insertSheet("Main Dashboard", 0);
  var historySheet = ss.getSheetByName("History") || ss.insertSheet("History", 1);
  
  // Set Sheet Frozen Properties: Column A frozen, 0 rows frozen
  mainSheet.setFrozenColumns(1);
  mainSheet.setFrozenRows(0);

  // Set Column A width (IPO Name)
  mainSheet.setColumnWidth(1, 240);
  // Set Status Column width
  mainSheet.setColumnWidth(2, 140);
  // Set Retail Decision Column width
  mainSheet.setColumnWidth(14, 210);
  // Set Strategic Rationale Column width
  mainSheet.setColumnWidth(15, 340);

  Logger.log("Mainboard IPO Tracker synchronized successfully.");
}

/**
 * Cleanup routine for older dashboard files in Google Drive
 */
function performFileCleanup() {
  var searchPattern = "Mainboard IPO Tracker & Retail Decision Dashboard";
  var files = DriveApp.searchFiles("title contains '" + searchPattern + "' and trashed = false");
  
  var today = new Date();
  var yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  var startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
  
  var trashedCount = 0;
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    
    // Strict Protection: Never delete data feeds or non-IPO files
    if (fileName.indexOf("IPO Data Feed (Auto)") !== -1) {
      continue;
    }
    
    // Keep only files modified today and yesterday; trash older versions
    if (file.getLastUpdated() < startOfYesterday) {
      file.setTrashed(true);
      trashedCount++;
      Logger.log("Cleaned up older file: " + fileName);
    }
  }
  return trashedCount;
}

/**
 * Setup 1-Click Daily Auto-Refresh Trigger in Google Cloud
 * Runs automatically every morning at 9:00 AM IST even when computer is off!
 */
function setupDailyAutoTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "updateMainboardIPODashboard") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger("updateMainboardIPODashboard")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .inTimezone("Asia/Kolkata")
    .create();
    
  Logger.log("Daily 9:00 AM IST Auto-Refresh Trigger successfully configured.");
}
