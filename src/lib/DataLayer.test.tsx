import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { CacheProvider, DataConsumer } from './DataLayer';

test('resolves the fetch promise and provides data to the consumer', async () => {
  render(
    <CacheProvider>
      <p>Data Layer Test</p>
      <DataConsumer<string>
        id="test-data"
        fetch={() => new Promise((r) => r('1234567890'))}
      >
        {(data) => <h1>{data}</h1>}
      </DataConsumer>
    </CacheProvider>
  );

  await waitFor(() => screen.getByRole('heading'));

  expect(screen.getByRole('heading')).toHaveTextContent('1234567890');
});
