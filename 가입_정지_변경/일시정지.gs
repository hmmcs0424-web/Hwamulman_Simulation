/**
 * 화물맨 회원관리 가이드 서버 로직
 * 관리자 암호: hmm0424
 * Google Drive에 JSON 파일로 저장 (용량 제한 없음)
 */
const ADMIN_PASSWORD = "hmm0424";
const FOLDER_ID = "13xRxIYaYwScAbJW8dNdk-C00dKq8w6KU";
const FILE_NAME = "guide_suspend.json";

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('화물맨 회원관리 업무 가이드')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getStoredData() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFilesByName(FILE_NAME);
    
    if (files.hasNext()) {
      const file = files.next();
      return file.getBlob().getDataAsString();
    }
    return null;
  } catch (e) {
    console.error("데이터 불러오기 실패:", e);
    return null;
  }
}

function saveStoredData(jsonString, inputPassword) {
  if (inputPassword !== ADMIN_PASSWORD) {
    return "에러: 암호가 올바르지 않습니다.";
  }
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFilesByName(FILE_NAME);
    
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }
    
    folder.createFile(FILE_NAME, jsonString, 'application/json');
    
    return "성공: 데이터가 Google Drive에 안전하게 저장되었습니다.";
  } catch (e) {
    console.error("저장 실패:", e);
    return "에러: " + e.toString();
  }
}

function verifyPassword(pw) {
  return pw === ADMIN_PASSWORD;
}