export function writeTextInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  element.focus();

  // React and modern frameworks override the `value` setter on HTMLInputElement/HTMLTextAreaElement.
  // By using the native prototype descriptor, the framework's internal tracker is notified.
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  // Dispatch both 'input' and 'change' events with bubbles: true
  element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
}
