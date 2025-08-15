import * as React from 'react';
function Blockonomics(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 60" {...props}>
      <text x="0" y="40" fontSize="32" fontWeight="bold">
        Blockonomics
      </text>
    </svg>
  );
}
export default React.memo(Blockonomics);
