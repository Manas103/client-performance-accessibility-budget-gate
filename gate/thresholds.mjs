// Pure comparator: given a rendered DOM row count and a virtualization row threshold,
// decides pass/fail and returns the number that would go in a failure message.
// No browser here either: checkVirtualization.mjs does the Playwright part and calls this.

export function checkVirtualizationThreshold(renderedRowCount, threshold) {
  const violated = renderedRowCount > threshold;
  return {
    renderedRowCount,
    threshold,
    violated,
  };
}

// Pure comparator for the focus check's own bookkeeping: given the sequence of
// activeElement tag names seen while tabbing, decides whether focus was ever lost to body.
export function checkFocusNeverLost(activeElementTagSequence) {
  const bodyIndexes = [];
  activeElementTagSequence.forEach((tag, i) => {
    if (tag === 'BODY') bodyIndexes.push(i);
  });
  return {
    lost: bodyIndexes.length > 0,
    lostAtSteps: bodyIndexes,
    stepsChecked: activeElementTagSequence.length,
  };
}
