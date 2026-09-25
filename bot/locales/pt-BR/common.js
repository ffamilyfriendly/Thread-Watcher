{
  "commands": {
    "watch": {
      "thread": "tópico",
      "watch": "assistido",
      "unwatch": "desassistido"
    },
    "batch": {
      "fetching_title": "🔍 Buscando Tópicos...",
      "fetching_body": "Calma aí! Estou reunindo todos os tópicos em **{{channel_link}}** (incluindo os arquivados)\n*Isso pode demorar um pouco se tiver muitos tópicos...*",
      "cancelled": "cancelado",
      "result_title": "{{action}} {{action_amount}} tópicos",
      "will_watch_future": "Tópicos futuros irão também ser assistidos se eles correspondem com o filtro",
      "in_channel": "em {{channel_link}}"
    }
  },
  "advanced": {
    "embed_title": "Avançado",
    "regex_modal_title": "Avançado",
    "no_value": "`sem valor`",
    "edit_mode": "Modo Editar: o monitor atual será sobrescrito",
    "regex_helper": "**Dicas de Regex (Expressão regular)**\nExpressões regulares permitem que você encontre nomes de tópicos. usando padrões. Aqui estão alguns exemplos simples de como começar:\n\n> **Encontra tópicos que contenham uma palavra**\n> \\`._bug._\\` → Encontra tópicos com "bug" em qualquer lugar do nome. (exemplo, \"report-bug\", \"bug fix\").\n> \\`^help\\` → Encontra tópicos **começando com** \"help\" (exemplo, \"help-me\", \"help-desired\").\n\n> **Encontra frases exatas:** > \\`^bug report$\\` → Encontra _apenas_ tópicos nomeados exatamente \"bug report\".\n\n> **Excluir tópicos:**\n> Adicione \\`!\\` no começo para inverter a correspondência (exemplo, \\`!._wip._\\` ignora tópicos com \"wip\").\n\n📖 **[Guia completo de regex (em inglês)](https://docs.threadwatcher.xyz/usage/advanced-filtering#regex)**\n✨ **[Gerador de regex por IA](https://rgx.tools/)** (Externo)\n🔗 **[Guia de consulta rápida de regex](https://www.rexegg.com/regex-quickstart.html)** (Externo)\n💡 _Precisa de ajuda? Tente o seu padrão com o botão **Testar Regex**!_",
    "required_roles": "Cargo(s) necessário(s)",
    "required_tags": "Tag(s) necessária(s)",
    "roles": "Cargos",
    "tags": "Tags",
    "button": {
      "proceed": "Prosseguir",
      "cancel": "Cancelar",
      "set_regex": "Definir Regex",
      "clear_regex": "Limpar Regex",
      "test_regex": "Testar Regex"
    }
  },
  "audit": {
    "view_log": "Visualizar registro",
    "config_embed_title": "Configuração alterada",
    "config_desc": "para configuração `{{setting_key}}`",
    "cant_send_in_log_channel": "-# Não consigo criar mensagens em {{channel_link}}. Por favor, conceda-me permissões ou altere o canal de registro com `/config`.",
    "config_embed_from": "Valor antigo",
    "config_embed_to": "Valor novo",
    "batch_title": "{{action}} {{action_amount}} tópicos",
    "monitor_title": "Monitorar canal",
    "monitor_start": "Começado",
    "monitor_end": "Parado",
    "monitor_desc": "{{action}} monitar tópicos em {{channel_link}}",
    "thread_watch_title": "Status de monitoramento do tópico alterado",
    "thread_watch_desc": "Tópico {{channel_link}} foi {{action}}"
  },
  "errors": {
    "fatal": "Erro Fatal",
    "failed_without_clear_cause": "comando falhou sem uma causa limpa.",
    "permissions_err": {
      "you": "você",
      "bot": "o bot",
      "description": "{{command_tag}} exige que {{target}} a permissão {{permission}} seja aplicada."
    },
    "entitlement_err": {
      "title": "Recurso Premium Necessário",
      "command_requires_sku": "O comando **{{command_tag}}** é um recurso premium. [Atualize agora]({{link}}) para desbloquear esse e outras ferramentas avançadas para o seu servidor.",
      "command_option_requires_sku": "A opção **{{option_name}}** faz parte dos recursos premium do Thread-Watcher. [Faça o upgrade aqui]({{link}}) para acessá-la."
    }
  }
}
