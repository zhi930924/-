import unittest
import os
import tempfile
import json
from app import app
from domdb import add_new_user, get_db, get_user_by_id
from tinydb import TinyDB, Query
import bcrypt
import hashlib

class AppTestCase(unittest.TestCase):
    def setUp(self):
        # 建立臨時資料庫檔案
        self.db_fd, self.db_path = tempfile.mkstemp()
        app.config['TESTING'] = True
        app.config['DB_PATH'] = self.db_path
        os.environ['DB_PATH'] = self.db_path
        
        # 初始化測試資料庫
        self.db = TinyDB(self.db_path)
        self.app = app.test_client()
        
        # 建立測試用戶
        self.create_test_user()
        
    def create_test_user(self):
        # 創建測試用戶
        staff_id = "test001"
        password = "password123"
        sha256_pwd = hashlib.sha256(password.encode()).hexdigest()
        bcrypt_pwd = bcrypt.hashpw(sha256_pwd.encode(), bcrypt.gensalt()).decode()
        
        case_managers = self.db.table("case_managers")
        case_managers.insert({
            "staff_id": staff_id,
            "staff_name": "測試用戶",
            "password": bcrypt_pwd,
            "email": "test@example.com",
            "hospital_name": "測試醫院",
            "first_login": 0
        })
        
    def tearDown(self):
        # 刪除臨時資料庫
        os.close(self.db_fd)
        os.unlink(self.db_path)
        
    def test_login_page(self):
        # 測試登入頁面是否可以正常訪問
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'login', response.data.lower())
        
    def test_login_success(self):
        # 測試登入成功
        response = self.app.post('/login', data={
            'staff_id': 'test001',
            'password': 'password123'
        }, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'home', response.data.lower())
        
    def test_login_failed(self):
        # 測試登入失敗
        response = self.app.post('/login', data={
            'staff_id': 'test001',
            'password': 'wrong_password'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'error', response.data.lower())
        
    def test_create_patient(self):
        # 模擬登入狀態
        with self.app as client:
            with client.session_transaction() as session:
                session['staff_id'] = 'test001'
            
            # 測試創建病患資料
            response = client.post('/step1', data={
                'medical_record_no': 'TEST12345',
                'patient_name': '測試病患',
                'birth_date': '1980-01-01',
                'gender': '1',
                'id_document_type': '1',
                'id_document_no': 'A123456789'
            }, follow_redirects=True)
            
            self.assertEqual(response.status_code, 200)
            
            # 確認資料已儲存
            patients = self.db.table("patients")
            patient = patients.get(Query().medical_record_no == 'TEST12345')
            self.assertIsNotNone(patient)
            self.assertEqual(patient['patient_name'], '測試病患')
    
    def test_auto_save_step1(self):
        # 模擬登入狀態
        with self.app as client:
            with client.session_transaction() as session:
                session['staff_id'] = 'test001'
            
            # 測試自動儲存API
            response = client.post('/auto-save-step1', 
                                  data=json.dumps({
                                      'medical_record_no': 'TEST67890',
                                      'patient_name': '自動儲存測試'
                                  }),
                                  content_type='application/json')
            
            result = json.loads(response.data)
            self.assertTrue(result['success'])
            
            # 確認資料已儲存
            patients = self.db.table("patients")
            patient = patients.get(Query().medical_record_no == 'TEST67890')
            self.assertIsNotNone(patient)
            self.assertEqual(patient['patient_name'], '自動儲存測試')

if __name__ == '__main__':
    unittest.main() 