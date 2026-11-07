import Image from "next/image";
import darkLogo from "../../public/logo/bara_black_orange.png";
import lightLogo from "../../public/logo/bara_black_white.png";
import "./brand-logo.css";

export function BrandLogoFilters() {
  return (
    <svg className="bl-logo-filters" width="0" height="0" aria-hidden="true">
      <defs>
        <filter id="bara-logo-dark-matte" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 3 0 0 0 -.15"
          />
        </filter>
        <filter id="bara-logo-light-matte" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1.1 0 0 0 1.05"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function BrandLogo() {
  return (
    <span className="bl-brand-logo" role="img" aria-label="BARA">
      {/* Display only the approved artwork, excluding the presentation-board caption. */}
      <Image className="bl-logo-dark" src={darkLogo} alt="" sizes="192px" />
      <Image className="bl-logo-light" src={lightLogo} alt="" sizes="192px" />
    </span>
  );
}
