import assert from 'node:assert/strict';
import test from 'node:test';
import { MetadataController } from '../metadata/metadata.controller';
import { GatewayMetadataService } from '../../../application/metadata/gateway-metadata.service';

test('MetadataController returns company industry metadata', () => {
  const controller = new MetadataController(new GatewayMetadataService());
  const response = controller.listCompanyIndustries();

  assert.equal(response.message, 'Industry metadata loaded successfully');
  assert.ok(Array.isArray(response.data.items));
  assert.ok(response.data.items.length > 0);
  assert.equal(response.data.otherValue, 'other');
  assert.ok(response.data.items.some((item) => item.value === 'other' && item.allowsCustom));
});