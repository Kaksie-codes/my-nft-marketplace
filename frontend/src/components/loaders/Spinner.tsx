import React from 'react';
import { CgSpinner } from 'react-icons/cg';

type SpinnerProps = {
  sx?: React.CSSProperties;
  sxclass?: string;
};

const Spinner: React.FC<SpinnerProps> = ({ sx, sxclass = '' }) => {
//   return <CgSpinner style={sx} className={`animate-spin ${sxclass}`} />;
    return <h1>Loading...</h1>
};

export default Spinner;
