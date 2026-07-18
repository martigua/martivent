# Fish config for the martivent dev container. Kept separate from the personal
# dotfiles so the prompt can signal "you are inside the container, not the host".
# The personal git-helper functions/completions are symlinked in from the
# dotfiles submodule; the host-only conf.d snippets (omf, rustup) are NOT loaded
# — they source tools absent from the container and would error on every startup.

# Reuse the container-safe personal tweaks (LS_COLORS, PATH). This file does not
# touch omf/rustup, so sourcing it directly is safe.
set -l personal_config /workspace/docker/dev/vendor/dotfiles/.config/fish/config.fish
test -f $personal_config; and source $personal_config

# Full, unshortened path in the prompt (matches the host dotfiles preference).
set -g fish_prompt_pwd_dir_length 0

# Distinct container prompt: an orange "martivent" badge makes it unmistakable
# that this shell lives inside the dev container. Defined here (eagerly, at
# startup) so it wins over the autoloaded host fish_prompt from the submodule.
function fish_prompt --description 'martivent container prompt'
    set -l badge (set_color -o black -b FF8700)' martivent '(set_color normal)
    set -l userpart (set_color 89B4FA)$USER
    set -l pwdpart (set_color F5C2E7)(prompt_pwd)

    set -l git_info ''
    if set -l branch (command git symbolic-ref --short HEAD 2>/dev/null)
        set git_info ' '(set_color B4BEFE)"($branch)"
        command git diff-index --quiet HEAD -- 2>/dev/null
        or set git_info "$git_info"(set_color red)'*'
    end

    echo -s $badge ' ' $userpart (set_color ACB0BE) ' ' $pwdpart $git_info (set_color ACB0BE) ' ≡' (set_color normal)
    echo -n '  '
end

function fish_right_prompt
    # intentionally blank
end
