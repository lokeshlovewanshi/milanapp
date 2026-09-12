#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Matrimonial App
Tests all authentication, profile, likes, shortlist, and views functionality
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://matrimonial-app-1.preview.emergentagent.com/api"

class MatrimonialAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.users = {}  # Store user data and tokens
        self.test_results = []
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })
        
        if not success:
            print(f"   Response: {response_data}")
    
    def test_user_registration(self):
        """Test user registration for multiple users"""
        print("\n=== Testing User Registration ===")
        
        import time
        timestamp = int(time.time())
        
        test_users = [
            {"email": f"priya.sharma.{timestamp}@example.com", "password": "SecurePass123!", "name": "Priya Sharma"},
            {"email": f"rahul.gupta.{timestamp}@example.com", "password": "MyPassword456!", "name": "Rahul Gupta"},
            {"email": f"anjali.singh.{timestamp}@example.com", "password": "StrongPass789!", "name": "Anjali Singh"}
        ]
        
        for i, user_data in enumerate(test_users):
            try:
                response = requests.post(f"{self.base_url}/auth/register", json=user_data)
                
                if response.status_code == 200:
                    data = response.json()
                    user_key = f"user{i+1}"
                    self.users[user_key] = {
                        "data": user_data,
                        "token": data["token"],
                        "user_info": data["user"],
                        "headers": {"Authorization": f"Bearer {data['token']}"}
                    }
                    self.log_test(f"Register {user_data['name']}", True, 
                                f"User ID: {data['user']['id']}")
                else:
                    self.log_test(f"Register {user_data['name']}", False, 
                                f"Status: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test(f"Register {user_data['name']}", False, str(e))
    
    def test_user_login(self):
        """Test user login"""
        print("\n=== Testing User Login ===")
        
        if not self.users:
            self.log_test("Login Test", False, "No registered users to test login")
            return
            
        # Test login for first user
        user_data = self.users["user1"]["data"]
        try:
            response = requests.post(f"{self.base_url}/auth/login", json={
                "email": user_data["email"],
                "password": user_data["password"]
            })
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("User Login", True, f"Token received for {data['user']['name']}")
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("User Login", False, str(e))
    
    def test_google_auth(self):
        """Test Google OAuth authentication"""
        print("\n=== Testing Google Authentication ===")
        
        google_user = {
            "email": "google.user@gmail.com",
            "name": "Google User",
            "google_id": "google_123456789"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/google", json=google_user)
            
            if response.status_code == 200:
                data = response.json()
                self.users["google_user"] = {
                    "data": google_user,
                    "token": data["token"],
                    "user_info": data["user"],
                    "headers": {"Authorization": f"Bearer {data['token']}"}
                }
                self.log_test("Google Auth", True, f"User ID: {data['user']['id']}")
            else:
                self.log_test("Google Auth", False, f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Google Auth", False, str(e))
    
    def test_profile_management(self):
        """Test profile creation and updates"""
        print("\n=== Testing Profile Management ===")
        
        if "user1" not in self.users:
            self.log_test("Profile Management", False, "No authenticated user available")
            return
        
        headers = self.users["user1"]["headers"]
        
        # Test get current profile
        try:
            response = requests.get(f"{self.base_url}/profile/me", headers=headers)
            if response.status_code == 200:
                self.log_test("Get My Profile", True, "Profile retrieved successfully")
            else:
                self.log_test("Get My Profile", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get My Profile", False, str(e))
        
        # Test profile update
        profile_update = {
            "name": "Priya Sharma",  # Required field
            "marital_status": "Never Married",
            "gender": "Female",
            "height": "5'4\"",
            "education": "Masters",
            "occupation_detail": "Software Engineer",
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "about_myself": "Looking for a life partner who shares similar values and interests."
        }
        
        try:
            response = requests.put(f"{self.base_url}/profile/update", 
                                  json=profile_update, headers=headers)
            if response.status_code == 200:
                self.log_test("Update Profile", True, "Profile updated successfully")
            else:
                self.log_test("Update Profile", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Update Profile", False, str(e))
    
    def test_browse_profiles(self):
        """Test browsing profiles"""
        print("\n=== Testing Browse Profiles ===")
        
        if "user1" not in self.users:
            self.log_test("Browse Profiles", False, "No authenticated user available")
            return
        
        headers = self.users["user1"]["headers"]
        
        try:
            response = requests.get(f"{self.base_url}/profiles?skip=0&limit=20", headers=headers)
            if response.status_code == 200:
                profiles = response.json()
                # Check that current user is excluded
                current_user_id = self.users["user1"]["user_info"]["id"]
                current_user_in_results = any(p.get("id") == current_user_id for p in profiles)
                
                if current_user_in_results:
                    self.log_test("Browse Profiles", False, "Current user included in results")
                else:
                    self.log_test("Browse Profiles", True, f"Found {len(profiles)} profiles (excluding current user)")
            else:
                self.log_test("Browse Profiles", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Browse Profiles", False, str(e))
    
    def test_profile_viewing(self):
        """Test viewing specific profiles and view tracking"""
        print("\n=== Testing Profile Viewing ===")
        
        if len(self.users) < 2:
            self.log_test("Profile Viewing", False, "Need at least 2 users for testing")
            return
        
        user1_headers = self.users["user1"]["headers"]
        user2_id = self.users["user2"]["user_info"]["id"]
        
        # User1 views User2's profile
        try:
            response = requests.get(f"{self.base_url}/profile/{user2_id}", headers=user1_headers)
            if response.status_code == 200:
                self.log_test("View Specific Profile", True, f"Viewed profile {user2_id}")
            else:
                self.log_test("View Specific Profile", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("View Specific Profile", False, str(e))
        
        # Check view tracking for User2
        if "user2" in self.users:
            user2_headers = self.users["user2"]["headers"]
            try:
                response = requests.get(f"{self.base_url}/views/profile", headers=user2_headers)
                if response.status_code == 200:
                    views = response.json()
                    self.log_test("Get Profile Views", True, f"User2 has {len(views)} profile views")
                else:
                    self.log_test("Get Profile Views", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Get Profile Views", False, str(e))
    
    def test_likes_system(self):
        """Test complete likes system"""
        print("\n=== Testing Likes System ===")
        
        if len(self.users) < 2:
            self.log_test("Likes System", False, "Need at least 2 users for testing")
            return
        
        user1_headers = self.users["user1"]["headers"]
        user2_headers = self.users["user2"]["headers"]
        user2_id = self.users["user2"]["user_info"]["id"]
        user1_id = self.users["user1"]["user_info"]["id"]
        
        # User1 likes User2
        try:
            response = requests.post(f"{self.base_url}/like", 
                                   json={"liked_profile_id": user2_id}, 
                                   headers=user1_headers)
            if response.status_code == 200:
                self.log_test("Send Like", True, f"User1 liked User2 (ID: {user2_id})")
            else:
                self.log_test("Send Like", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Send Like", False, str(e))
        
        # Test duplicate like (should fail)
        try:
            response = requests.post(f"{self.base_url}/like", 
                                   json={"liked_profile_id": user2_id}, 
                                   headers=user1_headers)
            if response.status_code == 400:
                self.log_test("Duplicate Like Prevention", True, "Duplicate like correctly rejected")
            else:
                self.log_test("Duplicate Like Prevention", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Duplicate Like Prevention", False, str(e))
        
        # User1 checks sent likes
        try:
            response = requests.get(f"{self.base_url}/likes/sent", headers=user1_headers)
            if response.status_code == 200:
                sent_likes = response.json()
                self.log_test("Get Sent Likes", True, f"User1 has {len(sent_likes)} sent likes")
            else:
                self.log_test("Get Sent Likes", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Sent Likes", False, str(e))
        
        # User2 checks received likes
        try:
            response = requests.get(f"{self.base_url}/likes/received", headers=user2_headers)
            if response.status_code == 200:
                received_likes = response.json()
                self.log_test("Get Received Likes", True, f"User2 has {len(received_likes)} received likes")
            else:
                self.log_test("Get Received Likes", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Received Likes", False, str(e))
        
        # User2 accepts the like from User1
        try:
            response = requests.put(f"{self.base_url}/like/accept/{user1_id}", headers=user2_headers)
            if response.status_code == 200:
                self.log_test("Accept Like", True, f"User2 accepted like from User1")
            else:
                self.log_test("Accept Like", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Accept Like", False, str(e))
        
        # Test unlike functionality (User3 likes User1, then unlikes)
        if "user3" in self.users:
            user3_headers = self.users["user3"]["headers"]
            
            # User3 likes User1
            try:
                response = requests.post(f"{self.base_url}/like", 
                                       json={"liked_profile_id": user1_id}, 
                                       headers=user3_headers)
                if response.status_code == 200:
                    self.log_test("Setup Unlike Test", True, "User3 liked User1")
                    
                    # User3 unlikes User1
                    response = requests.delete(f"{self.base_url}/unlike/{user1_id}", headers=user3_headers)
                    if response.status_code == 200:
                        self.log_test("Unlike Profile", True, "User3 successfully unliked User1")
                    else:
                        self.log_test("Unlike Profile", False, f"Status: {response.status_code}", response.text)
                else:
                    self.log_test("Setup Unlike Test", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test("Unlike Test", False, str(e))
    
    def test_shortlist_system(self):
        """Test shortlist functionality"""
        print("\n=== Testing Shortlist System ===")
        
        if len(self.users) < 2:
            self.log_test("Shortlist System", False, "Need at least 2 users for testing")
            return
        
        user1_headers = self.users["user1"]["headers"]
        user2_id = self.users["user2"]["user_info"]["id"]
        
        # Add to shortlist
        try:
            response = requests.post(f"{self.base_url}/shortlist", 
                                   json={"shortlist_id": user2_id}, 
                                   headers=user1_headers)
            if response.status_code == 200:
                self.log_test("Add to Shortlist", True, f"User2 (ID: {user2_id}) added to User1's shortlist")
            else:
                self.log_test("Add to Shortlist", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Add to Shortlist", False, str(e))
        
        # Test duplicate shortlist (should fail)
        try:
            response = requests.post(f"{self.base_url}/shortlist", 
                                   json={"shortlist_id": user2_id}, 
                                   headers=user1_headers)
            if response.status_code == 400:
                self.log_test("Duplicate Shortlist Prevention", True, "Duplicate shortlist correctly rejected")
            else:
                self.log_test("Duplicate Shortlist Prevention", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Duplicate Shortlist Prevention", False, str(e))
        
        # Get shortlist
        try:
            response = requests.get(f"{self.base_url}/shortlist", headers=user1_headers)
            if response.status_code == 200:
                shortlist = response.json()
                self.log_test("Get Shortlist", True, f"User1 has {len(shortlist)} profiles in shortlist")
            else:
                self.log_test("Get Shortlist", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Shortlist", False, str(e))
        
        # Remove from shortlist
        try:
            response = requests.delete(f"{self.base_url}/shortlist/{user2_id}", headers=user1_headers)
            if response.status_code == 200:
                self.log_test("Remove from Shortlist", True, f"User2 removed from User1's shortlist")
            else:
                self.log_test("Remove from Shortlist", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Remove from Shortlist", False, str(e))
    
    def test_authentication_security(self):
        """Test authentication and security"""
        print("\n=== Testing Authentication Security ===")
        
        # Test accessing protected endpoint without token
        try:
            response = requests.get(f"{self.base_url}/profile/me")
            if response.status_code == 401 or response.status_code == 403:
                self.log_test("Unauthorized Access Prevention", True, "Protected endpoint correctly rejected unauthenticated request")
            else:
                self.log_test("Unauthorized Access Prevention", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Unauthorized Access Prevention", False, str(e))
        
        # Test with invalid token
        try:
            invalid_headers = {"Authorization": "Bearer invalid_token_here"}
            response = requests.get(f"{self.base_url}/profile/me", headers=invalid_headers)
            if response.status_code == 401:
                self.log_test("Invalid Token Rejection", True, "Invalid token correctly rejected")
            else:
                self.log_test("Invalid Token Rejection", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Invalid Token Rejection", False, str(e))
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Matrimonial App Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run tests in logical order
        self.test_user_registration()
        self.test_user_login()
        self.test_google_auth()
        self.test_authentication_security()
        self.test_profile_management()
        self.test_browse_profiles()
        self.test_profile_viewing()
        self.test_likes_system()
        self.test_shortlist_system()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        print("\n🎯 CRITICAL FUNCTIONALITY STATUS:")
        critical_tests = [
            "Register Priya Sharma", "Register Rahul Gupta", "User Login",
            "Get My Profile", "Update Profile", "Browse Profiles",
            "Send Like", "Get Sent Likes", "Get Received Likes", "Accept Like",
            "Add to Shortlist", "Get Shortlist"
        ]
        
        critical_failures = []
        for test_name in critical_tests:
            test_result = next((r for r in self.test_results if r["test"] == test_name), None)
            if test_result and not test_result["success"]:
                critical_failures.append(test_name)
        
        if critical_failures:
            print(f"❌ Critical failures detected: {len(critical_failures)}")
            for failure in critical_failures:
                print(f"   - {failure}")
        else:
            print("✅ All critical functionality working")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = MatrimonialAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)