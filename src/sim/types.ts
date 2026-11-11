export interface InputFrame {
  left: boolean; right: boolean; up: boolean; down: boolean;
  light: boolean; heavy: boolean; special: boolean; block: boolean; dodge: boolean;
}

export const EMPTY_INPUT: InputFrame = {
  left: false, right: false, up: false, down: false,
  light: false, heavy: false, special: false, block: false, dodge: false,
};
