"use strict";

const assert = require("node:assert/strict");

const {mock_esm, zrequire} = require("./lib/namespace.cjs");
const {run_test, noop} = require("./lib/test.cjs");
const $ = require("./lib/zjquery.cjs");

const MY_USER_ID = 5;

mock_esm("../src/people", {
    is_my_user_id(user_id) {
        return user_id === MY_USER_ID;
    },
    get_user_by_id_assert_valid(user_id) {
        return {user_id, full_name: `User ${user_id}`};
    },
    is_person_active: () => true,
});

mock_esm("../src/emoji", {
    get_server_realm_emoji_data: () => ({
        "1": {
            id: "1",
            name: "my_emoji",
            author_id: MY_USER_ID,
            deactivated: false,
            source_url: "/my.png",
            still_url: null,
        },
        "2": {
            id: "2",
            name: "other_emoji",
            author_id: 10,
            deactivated: false,
            source_url: "/other.png",
            still_url: null,
        },
    }),
});

mock_esm("../src/loading", {
    make_indicator: noop,
    destroy_indicator: noop,
});

let sort_author_full_name;
mock_esm("../src/list_widget", {
    create(_$container, _data, opts) {
        sort_author_full_name = opts.sort_fields.author_full_name;
        return {};
    },
    generic_sort_functions: () => ({}),
    default_get_item: noop,
});

const upload_widget = mock_esm("../src/upload_widget");
const settings_emoji = zrequire("settings_emoji");

run_test("add_custom_emoji_post_render", () => {
    let build_widget_stub = false;
    upload_widget.build_widget = (
        get_file_input,
        $file_name_field,
        $input_error,
        $clear_button,
        $upload_button,
    ) => {
        assert.equal(get_file_input()[0], $("#emoji_file_input")[0]);
        assert.equal($file_name_field[0], $("#emoji-file-name")[0]);
        assert.equal($input_error[0], $("#emoji_file_input_error")[0]);
        assert.equal($clear_button[0], $("#emoji_image_clear_button")[0]);
        assert.equal($upload_button[0], $("#emoji_upload_button")[0]);
        build_widget_stub = true;
    };
    settings_emoji.add_custom_emoji_post_render();
    assert.ok(build_widget_stub);
});

run_test("sort_author_full_name puts current user first", () => {
    const $emoji_table = $("#admin_emoji_table");
    const $settings_section = $.create(".settings-section");
    $emoji_table.set_closest_results(".settings-section", $settings_section);
    $settings_section.set_find_results("input.search", $.create("input.search"));

    settings_emoji.set_up();

    const my_emoji = {author_id: MY_USER_ID, author: {full_name: "Me"}};
    const other_emoji = {author_id: 10, author: {full_name: "Alice"}};

    // Current user's emoji sorts before any other user's emoji.
    assert.ok(sort_author_full_name(my_emoji, other_emoji) < 0);
    assert.ok(sort_author_full_name(other_emoji, my_emoji) > 0);
});
