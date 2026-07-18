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

# Distinct container prompt, colored from this repo's design-system tokens so it
# reads as "martivent" at a glance. Defined here (eagerly, at startup) so it wins
# over the autoloaded host fish_prompt from the dotfiles submodule.
function fish_prompt --description 'martivent container prompt'
    set -l last_status $status   # capture before any command runs

    # Design-system palette (docs/.../foundation-design.md, tier-1 primitives).
    set -l brand   f5c800   # --yellow-500  (action-primary)
    set -l chip_bg 2e2e2e   # --neutral-800 (surface-card)
    set -l muted   888888   # --neutral-400 (text-muted)
    set -l info     3b82f6  # --blue-500    (status-info)
    set -l danger   ef4444  # --red-500     (status-danger)

    # A dark on-brand chip, not a loud fill: subtle but unmistakably the container.
    set -l badge (set_color -b $chip_bg $brand)' martivent '(set_color normal)
    set -l userpart (set_color $muted)$USER
    set -l pwdpart (set_color $brand)(prompt_pwd)

    set -l git_info ''
    if set -l branch (command git symbolic-ref --short HEAD 2>/dev/null)
        set git_info ' '(set_color $info)"($branch)"
        command git diff-index --quiet HEAD -- 2>/dev/null
        or set git_info "$git_info"(set_color $danger)'*'
    end

    echo -s $badge ' ' $userpart (set_color $muted) ' ' $pwdpart $git_info
    # Input line starts with an arrow: brand yellow normally, red if the last
    # command failed.
    test $last_status -eq 0; and set_color $brand; or set_color $danger
    echo -n '❯ '
    set_color normal
end

function fish_right_prompt
    # intentionally blank
end
