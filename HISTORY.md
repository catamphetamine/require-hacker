2.0.0 / 06.11.2015
==================

  * Some API changes: renamed `.resolver()` to `.global_hook()`, added a static `.to_javascript_module_source()` function

1.2.1, 1.2.2, 1.2.3 / 04.11.2015
==================

  * Less exclamative extension loader override warning (is now a debug message)

1.2.0 / 03.11.2015
==================

  * Fixed require() cache not being flushed when using .resolver()
  * Flushing require() cache on .unmount()

1.1.0 / 02.11.2015
==================

  * Added "precede_node_loader" option for .resolver()

1.0.0 / 02.11.2015
==================

  * Initial release