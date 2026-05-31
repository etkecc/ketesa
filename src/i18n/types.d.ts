import { TranslationMessages } from "ra-core";

export interface SynapseTranslationMessages extends TranslationMessages {
  ketesa: {
    auth: {
      base_url: string;
      welcome: string;
      description: string;
      server_version: string;
      supports_specs: string;
      username_error: string;
      protocol_error: string;
      url_error: string;
      sso_sign_in: string;
      oidc_sign_in: string;
      credentials: string;
      access_token: string;
      server_state: {
        resolving: string;
        unreachable: string;
        incompatible: string;
        suppress_password_notice: string;
        checking: string;
      };
      logout_access_token_dialog: {
        title: string;
        content: string;
        confirm: string;
        cancel: string;
      };
    };
    users: {
      invalid_user_id: string;
      tabs: { sso: string; experimental: string; limits: string; account_data: string; sessions: string };
      danger_zone: string;
    };
    rooms: {
      details: string;
      tabs: {
        basic: string;
        members: string;
        detail: string;
        permission: string;
        media: string;
        messages: string;
        hierarchy: string;
      };
    };
    reports: { tabs: { basic: string; detail: string } };
    admin_config: {
      soft_failed_events: string;
      spam_flagged_events: string;
      success: string;
      failure: string;
    };
  };
  import_users: {
    error: {
      at_entry: string;
      error: string;
      required_field: string;
      invalid_value: string;
      unreasonably_big: string;
      already_in_progress: string;
      id_exits: string;
    };
    title: string;
    goToPdf: string;
    cards: {
      importstats: {
        header: string;
        users_total: string;
        guest_count: string;
        admin_count: string;
      };
      conflicts: {
        header: string;
        mode: {
          stop: string;
          skip: string;
        };
      };
      ids: {
        header: string;
        all_ids_present: string;
        count_ids_present: string;
        mode: {
          ignore: string;
          update: string;
        };
      };
      passwords: {
        header: string;
        all_passwords_present: string;
        count_passwords_present: string;
        use_passwords: string;
      };
      upload: {
        header: string;
        explanation: string;
      };
      startImport: {
        simulate_only: string;
        run_import: string;
      };
      results: {
        header: string;
        total: string;
        successful: string;
        skipped: string;
        download_skipped: string;
        with_error: string;
        simulated_only: string;
      };
    };
  };
  delete_media: {
    name: string;
    fields: {
      before_ts: string;
      size_gt: string;
      keep_profiles: string;
    };
    action: {
      send: string;
      send_success: string;
      send_success_none: string;
      send_failure: string;
    };
    helper: {
      send: string;
    };
  };
  purge_remote_media: {
    name: string;
    fields: {
      before_ts: string;
    };
    action: {
      send: string;
      send_success: string;
      send_success_none: string;
      send_failure: string;
    };
    helper: {
      send: string;
    };
  };
  resources: {
    users: {
      name: string;
      email: string;
      msisdn: string;
      threepid: string;
      membership: string;
      fields: {
        avatar: string;
        id: string;
        name: string;
        is_guest: string;
        admin: string;
        locked: string;
        suspended: string;
        shadow_banned: string;
        deactivated: string;
        erased: string;
        show_guests: string;
        show_deactivated: string;
        show_locked: string;
        filter_user_all: string;
        filter_deactivated_false: string;
        filter_deactivated_true: string;
        filter_locked_false: string;
        filter_locked_true: string;
        filter_guests_false: string;
        filter_guests_true: string;
        show_system_users: string;
        filter_system_users_false: string;
        filter_system_users_true: string;
        show_suspended: string;
        show_shadow_banned: string;
        user_id: string;
        displayname: string;
        password: string;
        avatar_url: string;
        avatar_src: string;
        medium: string;
        threepids: string;
        address: string;
        creation_ts_ms: string;
        consent_version: string;
        sent_invite_count: string;
        cumulative_joined_room_count: string;
        auth_provider: string;
        user_type: string;
      };
      helper: {
        password: string;
        password_required_for_reactivation: string;
        create_password: string;
        lock: string;
        deactivate: string;
        suspend: string;
        shadow_ban: string;
        admin: string;
        erase: string;
        erase_text: string;
        erase_admin_error: string;
        modify_managed_user_error: string;
        username_available: string;
        sent_invite_count: string;
        cumulative_joined_room_count: string;
      };
      action: {
        erase: string;
        erase_avatar: string;
        delete_media: string;
        redact_events: string;
        redact_in_progress: string;
        redact_background_note: string;
        redact_success: string;
        redact_failure: string;
        generate_password: string;
        set_password_failure: string;
        set_admin_failure: string;
        reset_password: {
          label: string;
          title: string;
          helper: string;
          password: string;
          logout_devices: string;
          success: string;
          failure: string;
          error_no_password: string;
        };
        login_as: {
          label: string;
          title: string;
          helper: string;
          valid_until: string;
          success: string;
          failure: string;
          result_title: string;
          access_token: string;
          expires_at: string;
        };
        overwrite_title: string;
        overwrite_content: string;
        overwrite_cancel: string;
        overwrite_confirm: string;
        quarantine_all: {
          label: string;
          title: string;
          content: string;
          success: string;
          failure: string;
        };
        delete_all_media: {
          label: string;
          title: string;
          content: string;
          in_progress: string;
          background_note: string;
          success: string;
          failure: string;
        };
        delete_all_media_bulk: {
          title: string;
          content: string;
          success: string;
          partial_failure: string;
        };
        allow_cross_signing: {
          label: string;
          title: string;
          content: string;
          success: string;
          failure: string;
          no_key: string;
        };
        find_user: {
          label: string;
          title: string;
          lookup_type: string;
          by_threepid: string;
          by_auth_provider: string;
          provider: string;
          external_id: string;
          search: string;
          not_found: string;
          failure: string;
        };
        renew_account: {
          label: string;
          title: string;
          content: string;
          expiration: string;
          expiration_helper: string;
          renewal_emails: string;
          success: string;
          failure: string;
        };
        system_users_scan_in_progress: string;
        reverse_search_scan_in_progress: string;
      };
      badge: {
        you: string;
        bot: string;
        admin: string;
        support: string;
        regular: string;
        federated: string;
        system_managed: string;
      };
      limits: {
        messages_per_second: string;
        messages_per_second_text: string;
        burst_count: string;
        burst_count_text: string;
      };
      account_data: {
        title: string;
        global: string;
        rooms: string;
      };
    };
    rooms: {
      name: string;
      fields: {
        room_id: string;
        name: string;
        canonical_alias: string;
        joined_members: string;
        joined_local_members: string;
        joined_local_devices: string;
        state_events: string;
        version: string;
        is_encrypted: string;
        encryption: string;
        federatable: string;
        public: string;
        creator: string;
        join_rules: string;
        guest_access: string;
        history_visibility: string;
        topic: string;
        avatar: string;
        actions: string;
      };
      filter: {
        public_rooms: string;
        empty_rooms: string;
      };
      helper: {
        forward_extremities: string;
      };
      enums: {
        join_rules: {
          public: string;
          knock: string;
          invite: string;
          private: string;
          restricted: string;
        };
        guest_access: {
          can_join: string;
          forbidden: string;
        };
        history_visibility: {
          invited: string;
          joined: string;
          shared: string;
          world_readable: string;
        };
        unencrypted: string;
        room_type: {
          room: string;
          space: string;
        };
      };
      action: {
        erase: {
          title: string;
          content: string;
          fields: {
            block: string;
          };
          in_progress: string;
          background_note: string;
          success: string;
          failure: string;
        };
        make_admin: {
          assign_admin: string;
          title: string;
          confirm: string;
          content: string;
          success: string;
          failure: string;
        };
        join: {
          label: string;
          title: string;
          confirm: string;
          content: string;
          success: string;
          failure: string;
        };
        block: {
          label: string;
          title: string;
          title_bulk: string;
          title_by_id: string;
          content: string;
          content_bulk: string;
          success: string;
          failure: string;
        };
        unblock: {
          label: string;
          success: string;
          failure: string;
        };
        purge_history: {
          label: string;
          title: string;
          content: string;
          date_label: string;
          delete_local: string;
          in_progress: string;
          background_note: string;
          success: string;
          failure: string;
        };
        quarantine_all: {
          label: string;
          title: string;
          content: string;
          success: string;
          failure: string;
        };
        delete_all_media: {
          label: string;
          title: string;
          content: string;
          in_progress_loading: string;
          in_progress: string;
          do_not_close: string;
          success: string;
          failure: string;
        };
        delete_all_media_bulk: {
          title: string;
          content: string;
          success: string;
          partial_failure: string;
        };
        event_context: {
          jump_to_date: string;
          direction: string;
          forward: string;
          backward: string;
          target_event: string;
          events_before: string;
          events_after: string;
          not_found: string;
          failure: string;
        };
        messages: {
          load_older: string;
          load_newer: string;
          no_messages: string;
          failure: string;
          filter: string;
          filter_type: string;
          filter_sender: string;
          advanced_filters: string;
          filter_not_type: string;
          filter_not_sender: string;
          contains_url: string;
          any: string;
          with_url: string;
          without_url: string;
          apply_filter: string;
          clear_filters: string;
        };
        hierarchy: {
          load_more: string;
          max_depth: string;
          unlimited: string;
          refresh: string;
          members: string;
          space: string;
          room: string;
          suggested: string;
          no_children: string;
          failure: string;
        };
      };
    };
    reports: {
      name: string;
      fields: {
        id: string;
        received_ts: string;
        user_id: string;
        name: string;
        score: string;
        reason: string;
        event_id: string;
        sender: string;
      };
      action: {
        erase: {
          title: string;
          content: string;
        };
        event_lookup: {
          label: string;
          title: string;
          fetch: string;
        };
        fetch_event_error: string;
      };
    };
    scheduled_tasks: {
      name: string;
      fields: {
        id: string;
        action: string;
        status: string;
        timestamp: string;
        resource_id: string;
        result: string;
        error: string;
        max_timestamp: string;
      };
      status: {
        scheduled: string;
        active: string;
        complete: string;
        cancelled: string;
        failed: string;
      };
    };
    connections: {
      name: string;
      fields: {
        last_seen: string;
        ip: string;
        user_agent: string;
      };
    };
    devices: {
      name: string;
      fields: {
        device_id: string;
        display_name: string;
        last_seen_ts: string;
        last_seen_ip: string;
        last_seen_user_agent: string;
        dehydrated: string;
      };
      action: {
        erase: {
          title: string;
          title_bulk: string;
          content: string;
          content_bulk: string;
          success: string;
          failure: string;
        };
        display_name: {
          success: string;
          failure: string;
        };
        create: {
          label: string;
          title: string;
          success: string;
          failure: string;
        };
      };
    };
    users_media: {
      name: string;
      fields: {
        media_id: string;
        media_length: string;
        media_type: string;
        upload_name: string;
        quarantined_by: string;
        safe_from_quarantine: string;
        created_ts: string;
        last_access_ts: string;
      };
      action: {
        open: string;
      };
    };
    protect_media: {
      action: {
        create: string;
        delete: string;
        none: string;
        send_success: string;
        send_failure: string;
      };
    };
    quarantine_media: {
      action: {
        name: string;
        create: string;
        delete: string;
        none: string;
        send_success: string;
        send_failure: string;
      };
    };
    pushers: {
      name: string;
      fields: {
        app: string;
        app_display_name: string;
        app_id: string;
        device_display_name: string;
        kind: string;
        lang: string;
        profile_tag: string;
        pushkey: string;
        data: {
          url: string;
        };
      };
    };
    servernotices: {
      name: string;
      send: string;
      fields: {
        body: string;
      };
      action: {
        send: string;
        send_success: string;
        send_failure: string;
      };
      helper: {
        send: string;
      };
    };
    database_room_statistics: {
      name: string;
      fields: {
        room_id: string;
        estimated_size: string;
      };
      helper: {
        info: string;
      };
    };
    user_media_statistics: {
      name: string;
      fields: {
        media_count: string;
        media_length: string;
      };
    };
    forward_extremities: {
      name: string;
      fields: {
        id: string;
        received_ts: string;
        depth: string;
        state_group: string;
      };
    };
    room_state: {
      name: string;
      fields: {
        type: string;
        content: string;
        origin_server_ts: string;
        sender: string;
      };
    };
    room_media: {
      name: string;
      fields: {
        media_id: string;
      };
      helper: {
        info: string;
      };
      action: {
        error: string;
      };
    };
    room_directory: {
      name: string;
      fields: {
        world_readable: string;
        guest_can_join: string;
      };
      action: {
        title: string;
        content: string;
        erase: string;
        create: string;
        send_success: string;
        send_failure: string;
      };
    };
    destinations: {
      name: string;
      fields: {
        destination: string;
        failure_ts: string;
        retry_last_ts: string;
        retry_interval: string;
        last_successful_stream_ordering: string;
        stream_ordering: string;
      };
      action: {
        reconnect: string;
      };
    };
    registration_tokens: {
      name: string;
      fields: {
        token: string;
        valid: string;
        uses_allowed: string;
        pending: string;
        completed: string;
        expiry_time: string;
        length: string;
        created_at: string;
        last_used_at: string;
        revoked_at: string;
      };
      helper: {
        length: string;
      };
      action: {
        revoke: {
          label: string;
          success: string;
        };
        unrevoke: {
          label: string;
          success: string;
        };
      };
    };
    account_data: {
      name: string;
    };
    joined_rooms: {
      name: string;
    };
    memberships: {
      name: string;
    };
    room_members: {
      name: string;
    };
    destination_rooms: {
      name: string;
    };
    mas_users: {
      name: string;
      fields: {
        id: string;
        username: string;
        admin: string;
        locked: string;
        deactivated: string;
        legacy_guest: string;
        created_at: string;
        locked_at: string;
        deactivated_at: string;
      };
      filter: {
        status: string;
        search: string;
        status_active: string;
        status_locked: string;
        status_deactivated: string;
      };
      action: {
        lock: { label: string; success: string };
        unlock: { label: string; success: string };
        deactivate: { label: string; success: string };
        reactivate: { label: string; success: string };
        set_admin: { label: string; success: string };
        remove_admin: { label: string; success: string };
        set_password: { label: string; title: string; success: string; failure: string };
      };
    };
    mas_user_emails: {
      name: string;
      empty: string;
      fields: {
        email: string;
        user_id: string;
        created_at: string;
        actions: string;
      };
      action: {
        remove: {
          label: string;
          title: string;
          content: string;
          success: string;
        };
        create: { success: string };
      };
    };
    mas_compat_sessions: {
      name: string;
      empty: string;
      fields: {
        user_id: string;
        device_id: string;
        created_at: string;
        user_agent: string;
        last_active_at: string;
        last_active_ip: string;
        finished_at: string;
        human_name: string;
        active: string;
      };
      action: {
        finish: {
          label: string;
          title: string;
          content: string;
          success: string;
        };
      };
    };
    mas_oauth2_sessions: {
      name: string;
      empty: string;
      fields: {
        user_id: string;
        client_id: string;
        scope: string;
        created_at: string;
        user_agent: string;
        last_active_at: string;
        last_active_ip: string;
        finished_at: string;
        human_name: string;
        active: string;
      };
      action: {
        finish: {
          label: string;
          title: string;
          content: string;
          success: string;
        };
      };
    };
    mas_personal_sessions: {
      name: string;
      empty: string;
      fields: {
        owner_user_id: string;
        actor_user_id: string;
        human_name: string;
        scope: string;
        created_at: string;
        revoked_at: string;
        last_active_at: string;
        last_active_ip: string;
        expires_at: string;
        expires_in: string;
        active: string;
      };
      helper: {
        expires_in: string;
      };
      action: {
        revoke: {
          label: string;
          title: string;
          content: string;
          success: string;
        };
        create: {
          token_title: string;
          token_content: string;
        };
      };
    };
    mas_sessions: {
      status: {
        active: string;
        finished: string;
        revoked: string;
      };
    };
    mas_policy_data: {
      name: string;
      current_policy: string;
      no_policy: string;
      set_policy: string;
      invalid_json: string;
      fields: {
        json_placeholder: string;
        created_at: string;
      };
      action: {
        save: {
          label: string;
          success: string;
          failure: string;
        };
      };
    };
    mas_user_sessions: {
      name: string;
      fields: {
        user_id: string;
        created_at: string;
        finished_at: string;
        user_agent: string;
        last_active_at: string;
        last_active_ip: string;
        active: string;
      };
      action: {
        finish: {
          label: string;
          title: string;
          content: string;
          success: string;
        };
      };
    };
    mas_upstream_oauth_links: {
      name: string;
      fields: {
        user_id: string;
        provider_id: string;
        subject: string;
        human_account_name: string;
        created_at: string;
      };
      helper: {
        provider_id: string;
      };
      action: {
        remove: {
          label: string;
          title: string;
          content: string;
          success: string;
        };
      };
    };
    mas_upstream_oauth_providers: {
      name: string;
      fields: {
        issuer: string;
        human_name: string;
        brand_name: string;
        created_at: string;
        disabled_at: string;
        enabled: string;
      };
    };
  };
  etkecc: {
    donate: {
      menu_label: string;
      name: string;
      title: string;
      description_1: string;
      description_2: string;
      description_3: string;
      description_4: string;
      button: string;
      signature_team: string;
    };
    billing: {
      name: string;
      title: string;
      no_payments: string;
      no_payments_helper: string;
      description1: string;
      description2: string;
      fields: {
        transaction_id: string;
        email: string;
        type: string;
        amount: string;
        paid_at: string;
        invoice: string;
      };
      enums: {
        type: {
          subscription: string;
          one_time: string;
        };
      };
      helper: {
        download_invoice: string;
        downloading: string;
        download_started: string;
        invoice_not_available: string;
        loading: string;
        loading_failed1: string;
        loading_failed2: string;
        loading_failed3: string;
        loading_failed4: string;
      };
      components: string;
      components_no_section: string;
      components_per_month: string;
      components_included: string;
      components_total: string;
      components_help_title: string;
      components_state_install: string;
      components_state_remove: string;
      components_remove_aria: string;
      components_preview_label: string;
      components_request_changes: string;
      components_requesting: string;
      components_request_failure: string;
      components_request_sent_title: string;
      components_request_sent_body: string;
      components_request_sent_close: string;
      components_request_sent_view: string;
      components_request_already_sent: string;
      components_request_already_sent_view: string;
      status: {
        issue: {
          title: string;
          description: string;
          due_overdue: string;
          due_upcoming: string;
          expected: string;
          last_paid: string;
          fix_link: string;
          fix_mismatch_link: string;
          support_link: string;
        };
      };
    };
    components: {
      name: string;
      description: string;
      tagline: string;
      no_section: string;
      per_month: string;
      included: string;
      free_label: string;
      available_label: string;
      total: string;
      loading: string;
      state_add: string;
      state_remove: string;
      add_aria: string;
      remove_aria: string;
      preview_label: string;
      request_changes: string;
      requesting: string;
      request_failure: string;
      request_sent_title: string;
      request_sent_body: string;
      request_sent_close: string;
      request_sent_view: string;
      request_already_sent: string;
      request_already_sent_view: string;
      section: {
        bridges: string;
        extras: string;
        matrix_apps: string;
        matrix_bots: string;
        matrix_extras: string;
      };
    };
    status: {
      name: string;
      badge: {
        default: string;
        running: string;
        status_ok: string;
        status_error: string;
        status_maintenance: string;
        status_process_running: string;
        status_checking: string;
      };
      category: {
        "Host Metrics": string;
        Network: string;
        HTTP: string;
        Matrix: string;
      };
      status: string;
      error: string;
      loading: string;
      intro1: string;
      intro2: string;
      help: string;
    };
    maintenance: {
      title: string;
      try_again: string;
      note: string;
    };
    notifications: {
      title: string;
      new_notifications: string;
      no_notifications: string;
      see_all: string;
      clear_all: string;
      ago: string;
    };
    currently_running: {
      command: string;
      started_ago: string;
    };
    time: {
      less_than_minute: string;
      minutes: string;
      hours: string;
      days: string;
      weeks: string;
      months: string;
    };
    support: {
      name: string;
      menu_label: string;
      description: string;
      create_title: string;
      no_requests: string;
      no_messages: string;
      closed_message: string;
      fields: {
        subject: string;
        message: string;
        reply: string;
        status: string;
        created_at: string;
        updated_at: string;
      };
      status: {
        active: string;
        open: string;
        closed: string;
        pending: string;
      };
      buttons: {
        new_request: string;
        submit: string;
        cancel: string;
        send: string;
        back: string;
        attach_files: string;
      };
      helper: {
        loading: string;
        reply_hint: string;
        reply_placeholder: string;
        before_contact_title: string;
        help_pages_prompt: string;
        services_prompt: string;
        topics_prompt: string;
        scope_confirm_label: string;
        english_only_notice: string;
        response_time_prompt: string;
        attachments_limit: string;
        close_request_label: string;
      };
      actions: {
        create_success: string;
        create_failure: string;
        send_failure: string;
        attachment_too_large: string;
        too_many_attachments: string;
        total_size_exceeded: string;
      };
    };
    actions: {
      name: string;
      available_title: string;
      available_description: string;
      available_help_intro: string;
      scheduled_title: string;
      scheduled_description: string;
      recurring_title: string;
      recurring_description: string;
      scheduled_help_intro: string;
      recurring_help_intro: string;
      maintenance_title: string;
      maintenance_try_again: string;
      maintenance_note: string;
      maintenance_commands_blocked: string;
      table: {
        aria_label: string;
        command: string;
        description: string;
        arguments: string;
        is_recurring: string;
        run_at: string;
        next_run_at: string;
        time_utc: string;
        time_local: string;
      };
      buttons: {
        create: string;
        update: string;
        back: string;
        delete: string;
        run: string;
      };
      command_scheduled: string;
      command_scheduled_args: string;
      expect_prefix: string;
      expect_suffix: string;
      notifications_link: string;
      command_help_title: string;
      scheduled_title_create: string;
      scheduled_title_edit: string;
      recurring_title_create: string;
      recurring_title_edit: string;
      scheduled_details_title: string;
      recurring_warning: string;
      command_details_intro: string;
      form: {
        id: string;
        command: string;
        scheduled_at: string;
        day_of_week: string;
      };
      delete_scheduled_title: string;
      delete_recurring_title: string;
      delete_confirm: string;
      errors: {
        unknown: string;
        delete_failed: string;
      };
      days: {
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
      };
      scheduled: {
        action: {
          create_success: string;
          update_success: string;
          update_failure: string;
          delete_success: string;
          delete_failure: string;
        };
      };
      recurring: {
        action: {
          create_success: string;
          update_success: string;
          update_failure: string;
          delete_success: string;
          delete_failure: string;
        };
      };
    };
  };
}
