import { test, expect } from '../../dist';
import * as ButtonStories from './Button.stories';

test('renders', async ({ mount }) => {
  // const button = await mount(<Button label="Button" primary />);
  // const button = await mount('example-button--primary');
  const button = await mount(ButtonStories.Primary);
  await expect(button).toContainText('Button');
});

test('interacts', async ({ mount }) => {
  let count = 0;
  // const button = await mount(
  //   <Button
  //     label="Button"
  //     primary
  //     onClick={() => {
  //       count += 1;
  //     }}
  //   />
  // );
  const button = await mount(ButtonStories.Primary, {
    onClick: () => {
      count += 1;
    },
  });
  await button.click();
  await expect(count).toBe(1);
});
