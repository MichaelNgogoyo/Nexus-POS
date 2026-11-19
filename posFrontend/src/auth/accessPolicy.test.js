import test from 'node:test';
import assert from 'node:assert/strict';
import { landingRouteForRoles, permissionsForRoles } from './accessPolicy.js';

test('restaurant admins do not receive platform management permissions', () => {
  const permissions = permissionsForRoles(['ADMIN']);
  assert.equal(permissions.has('manage_users'), false);
  assert.equal(permissions.has('manage_settings'), false);
  assert.equal(permissions.has('manage_platform'), false);
  assert.equal(permissions.has('view_audit'), false);
});

test('super admin receives platform controls and still lands in the platform console', () => {
  const permissions = permissionsForRoles(['SUPER_ADMIN']);
  assert.equal(permissions.has('manage_platform'), true);
  assert.equal(permissions.has('manage_users'), true);
  assert.equal(permissions.has('view_audit'), true);
  assert.equal(landingRouteForRoles(['SUPER_ADMIN']), '/super-admin');
});
