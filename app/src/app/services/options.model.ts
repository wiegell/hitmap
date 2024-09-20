import { map, ZoomTransform } from "d3";
import { cloneDeep } from "lodash-es";

enum option {
  groupBy,
  hoveredStandard,
  selectedStandard,
}

type ZoomTransformOptionValue = {
  k: number;
  x: number;
  y: number;
};

enum groupByOptionValue {
  vendor,
  none,
}

type optionValue = groupByOptionValue | ZoomTransformOptionValue;

export const optionsQueryParamName = "options";
export const zoomQueryParamName = "zoom";
export type queryParam = Partial<{
  [Key in typeof optionsQueryParamName | typeof zoomQueryParamName]: string;
}>;

export class GeneralOptions {
  protected optionsMap = new Map<number, optionValue>();

  // Encode/decode
  public base64UrlEncode() {
    const json = JSON.stringify(Array.from(this.optionsMap.entries()));
    const b64 = btoa(json);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Value accessors
  // public set language(language: ZoomTransformOptionValue) {
  //   this.optionsMap.set(option.zoomTransform, zoomTransform);
  // }
  // public get language() {
  //   const zoomTransformOption = this.optionsMap.get(option.zoomTransform);
  //   if (zoomTransformOption == null) {
  //     return { k: 1, x: 0, y: 0 };
  //   }
  //   return zoomTransformOption as ZoomTransformOptionValue;
  // }
  // public toObject(): OptionsI {
  //   return this;
  // }

  /**
   *
   * @param b64url base64 url encoded string
   * @returns instance of the subclass created from the b64url encoded string
   */
  public static fromBase64UrlEncoded(b64url: string) {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = atob(b64);
    const map = new Map<option, optionValue>(JSON.parse(json));
    const options = new GeneralOptions();
    options.optionsMap = map;
    return options;
  }
}

export interface ZoomOptionsI {
  k: number;
  x: number;
  y: number;
}
export class ZoomOptions extends ZoomTransform implements ZoomOptionsI {
  // Encode/decode
  public base64UrlEncode() {
    const copy = cloneDeep(this) as ZoomOptionsI;
    copy.k = Math.round(copy.k * 100) / 100;
    copy.x = Math.round(copy.x * 100) / 100;
    copy.y = Math.round(copy.y * 100) / 100;
    const json = JSON.stringify(copy);
    const b64 = btoa(json);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  public static fromBase64UrlEncoded(b64url: string) {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = atob(b64);
    const parsed = JSON.parse(json) as object;
    if (
      !(
        typeof parsed == "object" &&
        Object.getOwnPropertyNames(parsed).includes("k") &&
        Object.getOwnPropertyNames(parsed).includes("x") &&
        Object.getOwnPropertyNames(parsed).includes("y")
      )
    ) {
      throw new Error("error parsing zoom options");
    }
    const zoomOptions = new ZoomOptions(
      (parsed as ZoomOptions).k,
      (parsed as ZoomOptions).x,
      (parsed as ZoomOptions).y
    );
    return zoomOptions;
  }
}
