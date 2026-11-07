import Image from "next/image";
import darkLogo from "../../public/logo/bara_black_orange.png";
import lightLogo from "../../public/logo/bara_black_white.png";

export function BrandLogo({ large = false }: { large?: boolean }) {
  return (
    <span className="bl-brand-logo" role="img" aria-label="BARA">
      {/* Display only the approved artwork, excluding the presentation-board caption. */}
      <Image className="bl-logo-dark" src={darkLogo} alt="" sizes={large ? "100vw" : "192px"} />
      <Image className="bl-logo-light" src={lightLogo} alt="" sizes={large ? "100vw" : "192px"} />
    </span>
  );
}
