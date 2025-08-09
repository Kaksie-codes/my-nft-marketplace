import React from "react";
import { LoaderCircle } from "lucide-react"; // or use iconsax-react if you prefer

type SpinnerProps = {
  sx?: React.CSSProperties;
  sxclass?: string;
};

const Spinner: React.FC<SpinnerProps> = ({ sx, sxclass = "" }) => {
  return <LoaderCircle className={`animate-spin ${sxclass}`} style={sx} />;
};

export default Spinner;
