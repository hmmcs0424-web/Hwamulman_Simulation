/**
 * 회원 정보 변경 가이드 - Google Apps Script (Drive 연동 버전)
 */

// 1. 구글 드라이브 폴더 ID (공유해주신 링크의 ID)
const FOLDER_ID = "1KRTlloFZIM8IDohU0cXaFiYXD6HzEsAp"; 
// 2. 저장될 파일 이름
const FILE_NAME = "member_guide_data.json"; 

/**
 * 웹앱 진입점 - GET 요청 처리
 * 주의: HTML 파일의 이름이 'index' 여야 합니다. (대소문자 구분)
 */
function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('회원 정보 변경 가이드')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    // 만약 index 파일을 못 찾으면 에러 메시지 출력
    return HtmlService.createHtmlOutput("<p>오류: 'index.html' 파일을 찾을 수 없습니다. Apps Script 에디터에서 HTML 파일 이름이 'index'인지 확인해 주세요.</p>");
  }
}

/**
 * 드라이브에서 데이터 불러오기
 * @return {string|null} - 저장된 JSON 문자열 또는 null
 */
function loadStoredData() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFilesByName(FILE_NAME);
    
    if (files.hasNext()) {
      const file = files.next();
      return file.getBlob().getDataAsString();
    }
    return null; // 파일이 없으면 null 반환 (기본값 사용)
  } catch (e) {
    Logger.log("데이터 불러오기 실패: " + e.toString());
    return null;
  }
}

/**
 * 드라이브에 데이터 저장하기
 * @param {string} jsonData - 저장할 JSON 문자열
 * @param {string} password - 보안 암호
 */
function saveStoredData(jsonData, password) {
  // 암호 확인
  if (password !== 'hmm0424') {
    throw new Error('암호가 일치하지 않습니다.');
  }
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFilesByName(FILE_NAME);
    
    if (files.hasNext()) {
      // 이미 파일이 있으면 내용 덮어쓰기
      const file = files.next();
      file.setContent(jsonData);
    } else {
      // 파일이 없으면 새로 생성
      folder.createFile(FILE_NAME, jsonData, MimeType.PLAIN_TEXT);
    }
    
    return "SUCCESS";
  } catch (error) {
    Logger.log('데이터 저장 오류:', error);
    throw new Error('데이터 저장 중 오류가 발생했습니다: ' + error.message);
  }
}