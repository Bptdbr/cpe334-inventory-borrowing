#!/usr/bin/env python3
import unittest
from unittest.mock import patch, MagicMock
import io
import json
import urllib.error

import deploy.smoke_test as smoke_test


class TestSmokeTest(unittest.TestCase):

    def test_check_readiness_success(self):
        fake_response = MagicMock()
        fake_response.getcode.return_value = 200
        fake_response.headers = {"Content-Type": "application/json"}
        fake_response.read.return_value = json.dumps({"status": "ready"}).encode("utf-8")
        fake_response.__enter__.return_value = fake_response

        with patch("urllib.request.urlopen", return_value=fake_response):
            self.assertTrue(smoke_test.check_readiness("http://localhost:3000"))

    def test_check_readiness_failure(self):
        with patch("urllib.request.urlopen", side_effect=urllib.error.HTTPError(
            url="http://localhost:3000/api/ready",
            code=503,
            msg="Service Unavailable",
            hdrs={},
            fp=io.BytesIO(b'{"status":"unready"}')
        )):
            self.assertFalse(smoke_test.check_readiness("http://localhost:3000"))

    def test_check_root_spa_success(self):
        fake_response = MagicMock()
        fake_response.getcode.return_value = 200
        fake_response.read.return_value = b"<!DOCTYPE html><html><body>Equipment Inventory</body></html>"
        fake_response.__enter__.return_value = fake_response

        with patch("urllib.request.urlopen", return_value=fake_response):
            self.assertTrue(smoke_test.check_root_spa("http://localhost:3000"))

    def test_check_auth_and_items_skipped_when_password_missing(self):
        self.assertTrue(smoke_test.check_auth_and_items("http://localhost:3000", "borrower1", ""))


if __name__ == "__main__":
    unittest.main()
